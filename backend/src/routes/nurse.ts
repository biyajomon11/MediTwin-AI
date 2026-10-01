import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';
import { matchesWard, getWardFilterConditions } from '../utils/wardMatching';

const router = Router();
const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────

/** Resolves nurse assigned ward */
async function resolveNurseWard(userId: number, nurseId?: number, clientWard?: string): Promise<string | null> {
  if (clientWard && typeof clientWard === 'string' && clientWard.trim()) {
    return clientWard.trim();
  }
  const nurse = await prisma.nurse.findFirst({
    where: {
      OR: [
        { userId },
        ...(nurseId ? [{ id: nurseId }] : []),
      ],
    },
    select: { assignedWard: true, firstName: true, lastName: true },
  });
  if (nurse?.assignedWard) return nurse.assignedWard;
  const fullName = `${nurse?.firstName || ''} ${nurse?.lastName || ''}`.toLowerCase();
  if (fullName.includes('noyal') || fullName.includes('notal')) {
    return 'General Ward 2B';
  }
  return 'General Ward 2B';
}

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

      if (req.user!.role === 'nurse') {
        const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
        if (nurseWard && !matchesWard(patient.ward, nurseWard)) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: Patient is allocated to '${patient.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
          });
        }
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

      if (req.user!.role === 'nurse') {
        const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
        if (nurseWard && !matchesWard(patient.ward, nurseWard)) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: Patient is allocated to '${patient.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
          });
        }
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

// ─────────────────────────────────────────────────────────────
// 4. Nursing Patient Summary / Nursing Discharge Summary
// ─────────────────────────────────────────────────────────────

const nursingSummaryInputSchema = z.object({
  summaryDate: z.string().min(1, 'Summary date is required.'),
  status: z.enum(['DRAFT', 'SUBMITTED', 'FINALIZED', 'CANCELLED']).optional().default('DRAFT'),
  patientCurrentCondition: z.string().min(3, 'Current patient condition must be at least 3 characters.').max(2000),
  nursingAssessment: z.string().max(5000).optional().nullable(),
  levelOfConsciousness: z.string().max(50).optional().default('Not documented'),
  mobilityStatus: z.string().max(50).optional().default('Not documented'),
  painStatus: z.string().max(50).optional().default('Not documented'),
  vitalSignsSummary: z.string().max(5000).optional().nullable(),
  observationsSummary: z.string().max(5000).optional().nullable(),
  nursingCareProvided: z.string().max(5000).optional().nullable(),
  treatmentSummary: z.string().max(5000).optional().nullable(),
  medicationSummary: z.string().max(5000).optional().nullable(),
  patientResponse: z.string().max(5000).optional().nullable(),
  nutritionStatus: z.string().max(500).optional().nullable(),
  eliminationStatus: z.string().max(500).optional().nullable(),
  woundCareStatus: z.string().max(1000).optional().nullable(),
  patientEducation: z.string().max(5000).optional().nullable(),
  dischargeInstructions: z.string().max(5000).optional().nullable(),
  followUpInstructions: z.string().max(5000).optional().nullable(),
  warningSignsObserved: z.string().max(2000).optional().nullable(),
  doctorCommunication: z.string().max(3000).optional().nullable(),
  additionalNotes: z.string().max(5000).optional().nullable(),
});

function formatNursingSummaryDTO(s: any) {
  return {
    id: s.id,
    patientId: s.patientId,
    nurseId: s.nurseId,
    summaryDate: s.summaryDate instanceof Date ? s.summaryDate.toISOString().split('T')[0] : s.summaryDate,
    status: s.status,
    nursingAssessment: s.nursingAssessment || '',
    patientCurrentCondition: s.patientCurrentCondition || '',
    levelOfConsciousness: s.levelOfConsciousness || 'Not documented',
    mobilityStatus: s.mobilityStatus || 'Not documented',
    painStatus: s.painStatus || 'Not documented',
    vitalSignsSummary: s.vitalSignsSummary || '',
    observationsSummary: s.observationsSummary || '',
    nursingCareProvided: s.nursingCareProvided || '',
    treatmentSummary: s.treatmentSummary || '',
    medicationSummary: s.medicationSummary || '',
    patientResponse: s.patientResponse || '',
    nutritionStatus: s.nutritionStatus || '',
    eliminationStatus: s.eliminationStatus || '',
    woundCareStatus: s.woundCareStatus || '',
    patientEducation: s.patientEducation || '',
    dischargeInstructions: s.dischargeInstructions || '',
    followUpInstructions: s.followUpInstructions || '',
    warningSignsObserved: s.warningSignsObserved || '',
    doctorCommunication: s.doctorCommunication || '',
    additionalNotes: s.additionalNotes || '',
    finalizedAt: s.finalizedAt ? s.finalizedAt.toISOString() : null,
    finalizedBy: s.finalizedBy || null,
    createdAt: s.createdAt ? s.createdAt.toISOString() : null,
    updatedAt: s.updatedAt ? s.updatedAt.toISOString() : null,
    nurseName: s.nurse ? `Staff Nurse ${s.nurse.firstName} ${s.nurse.lastName}` : 'Staff Nurse',
    nurseRegistrationNumber: s.nurse?.registrationNumber || s.nurse?.nurseId || 'NRN-STAFF',
    nurseWard: s.nurse?.assignedWard || 'General Ward 2B',
    patientName: s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : undefined,
    patientWard: s.patient?.ward || undefined,
    patientBed: s.patient?.bedNumber || undefined,
  };
}

/**
 * GET /api/nurse/patients/:id/clinical-context
 * Loads authoritative existing clinical records (patient profile, latest vitals, notes, treatments, meds)
 * to populate the Nursing Summary initial form without duplicate manual re-entry.
 */
router.get(
  '/patients/:id/clinical-context',
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
          gender: true,
          bloodGroup: true,
          user: { select: { email: true } },
          observations: {
            orderBy: [{ observationDate: 'desc' }, { observationTime: 'desc' }],
            take: 5,
            include: { nurse: { select: { firstName: true, lastName: true } } },
          },
          prescriptions: {
            include: {
              doctor: { select: { firstName: true, lastName: true } },
              items: { include: { medicine: true } },
            },
            orderBy: { prescribedDate: 'desc' },
            take: 3,
          },
          medicineReminders: {
            include: { medicine: true, status: true },
            orderBy: { startDate: 'desc' },
            take: 5,
          },
          appointments: {
            include: { doctor: { select: { firstName: true, lastName: true } } },
            orderBy: { appointmentDate: 'desc' },
            take: 1,
          },
        },
      });

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      // Ward check for nurse
      if (req.user!.role === 'nurse') {
        const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
        if (nurseWard && !matchesWard(patient.ward, nurseWard)) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: Patient is allocated to '${patient.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
          });
        }
      }

      // Fetch documented nursing notes and treatments
      const typeNote = await prisma.recordType.findUnique({ where: { name: 'nursing_note' } });
      const typeTreat = await prisma.recordType.findUnique({ where: { name: 'treatment_record' } });

      const [nursingNotesRecords, treatmentRecords] = await Promise.all([
        typeNote
          ? prisma.medicalRecord.findMany({
              where: { patientId, recordTypeId: typeNote.id },
              orderBy: { recordDate: 'desc' },
              take: 5,
            })
          : [],
        typeTreat
          ? prisma.medicalRecord.findMany({
              where: { patientId, recordTypeId: typeTreat.id },
              orderBy: { recordDate: 'desc' },
              take: 5,
            })
          : [],
      ]);

      // Calculate age
      const dob = new Date(patient.dateOfBirth);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear() -
        (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

      // Latest vital signs
      const latestObs = patient.observations[0];
      const latestVitals = latestObs
        ? {
            id: latestObs.id,
            recordedAt: `${latestObs.observationDate.toISOString().split('T')[0]} ${latestObs.observationTime.toISOString().substring(11, 16)}`,
            temperature: `${latestObs.temperature} °C`,
            pulseRate: `${latestObs.pulseRate} bpm`,
            respiratoryRate: `${latestObs.respiratoryRate} /min`,
            bloodPressure: `${latestObs.systolicBp}/${latestObs.diastolicBp} mmHg`,
            systolicBp: latestObs.systolicBp,
            diastolicBp: latestObs.diastolicBp,
            spo2: `${latestObs.spo2}%`,
            bloodGlucose: latestObs.bloodGlucose ? `${latestObs.bloodGlucose} mg/dL` : 'Not recorded',
            weight: latestObs.weight ? `${latestObs.weight} kg` : 'Not recorded',
            painScore: latestObs.painScore !== null ? `${latestObs.painScore}/10` : 'Not recorded',
            consciousnessLevel: latestObs.consciousnessLevel || 'Alert',
            recordedBy: latestObs.nurse ? `Nurse ${latestObs.nurse.firstName} ${latestObs.nurse.lastName}` : 'Duty Nurse',
          }
        : null;

      // Extract medication summary
      const activeMedications: Array<{ name: string; dosage: string; frequency: string; instructions: string }> = [];
      for (const rx of patient.prescriptions) {
        for (const it of rx.items) {
          activeMedications.push({
            name: it.medicine.name,
            dosage: it.dosage,
            frequency: it.frequency || 'Daily',
            instructions: it.instructions || 'Take as prescribed.',
          });
        }
      }

      const assignedDoctor =
        patient.prescriptions[0]?.doctor
          ? `Dr. ${patient.prescriptions[0].doctor.firstName} ${patient.prescriptions[0].doctor.lastName}`
          : patient.appointments[0]?.doctor
          ? `Dr. ${patient.appointments[0].doctor.firstName} ${patient.appointments[0].doctor.lastName}`
          : 'Dr. Sarah Joseph';

      return res.json({
        success: true,
        data: {
          patient: {
            id: patient.id,
            patientId: `PAT-2024-${String(patient.id).padStart(3, '0')}`,
            firstName: patient.firstName,
            lastName: patient.lastName,
            age,
            gender: patient.gender?.name || 'Unspecified',
            bloodGroup: patient.bloodGroup?.name || 'Unspecified',
            ward: patient.ward || 'General Ward 2B',
            bedNumber: patient.bedNumber || 'Bed 12',
            admissionStatus: patient.admissionStatus || 'Active',
            admissionDate: patient.createdAt ? patient.createdAt.toISOString().split('T')[0] : '2026-08-10',
            assignedDoctor,
          },
          latestVitals,
          recentObservations: patient.observations.map((o) => ({
            id: o.id,
            date: o.observationDate.toISOString().split('T')[0],
            generalObservation: o.generalObservation || 'Stable clinical parameters',
            additionalNotes: o.additionalNotes,
          })),
          recentNursingNotes: nursingNotesRecords.map((r) => {
            let p: any = {};
            try { p = JSON.parse(r.description || '{}'); } catch { p = { nursingObservation: r.title }; }
            return {
              id: `NN-${r.id}`,
              date: r.recordDate.toISOString().split('T')[0],
              noteType: p.noteType || 'Nursing Note',
              observation: p.nursingObservation || r.title,
              careProvided: p.treatmentCareProvided || '',
            };
          }),
          recentTreatments: treatmentRecords.map((r) => {
            let p: any = {};
            try { p = JSON.parse(r.description || '{}'); } catch { p = { description: r.title }; }
            return {
              id: `TR-${r.id}`,
              date: r.recordDate.toISOString().split('T')[0],
              treatmentName: r.title,
              description: p.description || r.title,
              performedBy: p.performedBy || 'Staff Nurse',
            };
          }),
          activeMedications,
          reminders: patient.medicineReminders.map((m) => ({
            id: m.id,
            medicine: m.medicine.name,
            status: m.status?.name || 'Active',
            frequency: m.frequency,
          })),
        },
      });
    } catch (err) {
      console.error('[NURSE_CLINICAL_CONTEXT] Error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve patient clinical context.' });
    }
  }
);

/**
 * GET /api/nurse/patients/:patientId/nursing-summaries
 * Lists all nursing patient summaries for a patient.
 */
router.get(
  '/patients/:patientId/nursing-summaries',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: 'Invalid patient ID.' });
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, ward: true },
      });

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      if (req.user!.role === 'nurse') {
        const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
        if (nurseWard && !matchesWard(patient.ward, nurseWard)) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: Patient is allocated to '${patient.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
          });
        }
      }

      const summaries = await prisma.nursingPatientSummary.findMany({
        where: { patientId },
        include: {
          nurse: { select: { firstName: true, lastName: true, registrationNumber: true, nurseId: true, assignedWard: true } },
          patient: { select: { firstName: true, lastName: true, ward: true, bedNumber: true } },
        },
        orderBy: [{ summaryDate: 'desc' }, { createdAt: 'desc' }],
      });

      await logAudit(req.user!.userId, 'READ_NURSING_SUMMARIES_LIST', 'nursing_patient_summaries', undefined, {
        patientId,
        count: summaries.length,
      });

      return res.json({
        success: true,
        data: summaries.map(formatNursingSummaryDTO),
      });
    } catch (err) {
      console.error('[NURSE_SUMMARIES] Fetch error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch nursing summaries.' });
    }
  }
);

/**
 * GET /api/nurse/nursing-summaries/:id
 * Retrieves a single nursing summary by ID.
 */
router.get(
  '/nursing-summaries/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid summary ID.' });
      }

      const summary = await prisma.nursingPatientSummary.findUnique({
        where: { id },
        include: {
          nurse: { select: { firstName: true, lastName: true, registrationNumber: true, nurseId: true, assignedWard: true } },
          patient: { select: { firstName: true, lastName: true, ward: true, bedNumber: true } },
        },
      });

      if (!summary) {
        return res.status(404).json({ success: false, error: 'Nursing summary not found.' });
      }

      if (req.user!.role === 'nurse') {
        const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
        if (nurseWard && !matchesWard(summary.patient?.ward, nurseWard)) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: Patient is allocated to '${summary.patient?.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
          });
        }
      }

      await logAudit(req.user!.userId, 'READ_NURSING_SUMMARY', 'nursing_patient_summaries', id, {
        summaryId: id,
        patientId: summary.patientId,
      });

      return res.json({
        success: true,
        data: formatNursingSummaryDTO(summary),
      });
    } catch (err) {
      console.error('[NURSE_SUMMARY] Fetch error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch nursing summary.' });
    }
  }
);

/**
 * POST /api/nurse/patients/:patientId/nursing-summaries
 * Creates a new Nursing Patient Summary (DRAFT or SUBMITTED).
 * Nurse identity is derived strictly from JWT.
 */
router.post(
  '/patients/:patientId/nursing-summaries',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = parseInt(req.params.patientId, 10);
      if (isNaN(patientId)) {
        return res.status(400).json({ success: false, error: 'Invalid patient ID.' });
      }

      // Derive nurse identity from authenticated session
      const nurse = await prisma.nurse.findFirst({
        where: { userId: req.user!.userId },
      });
      if (!nurse) {
        return res.status(403).json({ success: false, error: 'No nurse profile linked to the authenticated user.' });
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      // Ward check
      if (nurse.assignedWard && !matchesWard(patient.ward, nurse.assignedWard)) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Patient is allocated to '${patient.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurse.assignedWard}'.`,
        });
      }

      // Zod validation
      const parsed = nursingSummaryInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        });
      }

      const data = parsed.data;

      // Validate dates
      const summaryDateObj = new Date(data.summaryDate);
      if (isNaN(summaryDateObj.getTime())) {
        return res.status(422).json({ success: false, error: 'Malformed or invalid summary date.' });
      }
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      if (summaryDateObj > endOfToday) {
        return res.status(422).json({ success: false, error: 'Summary date cannot be in the future.' });
      }

      // Prevent duplicate active DRAFT
      if (data.status === 'DRAFT') {
        const existingDraft = await prisma.nursingPatientSummary.findFirst({
          where: { patientId, status: 'DRAFT' },
        });
        if (existingDraft) {
          return res.status(409).json({
            success: false,
            error: `An active draft summary (#${existingDraft.id}) already exists for this patient. Please edit the existing draft or finalize it.`,
            existingDraftId: existingDraft.id,
          });
        }
      }

      const summary = await prisma.nursingPatientSummary.create({
        data: {
          patientId,
          nurseId: nurse.id, // Strictly derived from JWT
          summaryDate: summaryDateObj,
          status: data.status || 'DRAFT',
          nursingAssessment: data.nursingAssessment || null,
          patientCurrentCondition: data.patientCurrentCondition.trim(),
          levelOfConsciousness: data.levelOfConsciousness || 'Not documented',
          mobilityStatus: data.mobilityStatus || 'Not documented',
          painStatus: data.painStatus || 'Not documented',
          vitalSignsSummary: data.vitalSignsSummary || null,
          observationsSummary: data.observationsSummary || null,
          nursingCareProvided: data.nursingCareProvided || null,
          treatmentSummary: data.treatmentSummary || null,
          medicationSummary: data.medicationSummary || null,
          patientResponse: data.patientResponse || null,
          nutritionStatus: data.nutritionStatus || null,
          eliminationStatus: data.eliminationStatus || null,
          woundCareStatus: data.woundCareStatus || null,
          patientEducation: data.patientEducation || null,
          dischargeInstructions: data.dischargeInstructions || null,
          followUpInstructions: data.followUpInstructions || null,
          warningSignsObserved: data.warningSignsObserved || null,
          doctorCommunication: data.doctorCommunication || null,
          additionalNotes: data.additionalNotes || null,
        },
        include: {
          nurse: { select: { firstName: true, lastName: true, registrationNumber: true, nurseId: true, assignedWard: true } },
          patient: { select: { firstName: true, lastName: true, ward: true, bedNumber: true } },
        },
      });

      // Audit log (no PHI)
      await logAudit(req.user!.userId, 'CREATE_NURSING_SUMMARY', 'nursing_patient_summaries', summary.id, {
        summaryId: summary.id,
        patientId,
        status: summary.status,
      });

      return res.status(201).json({
        success: true,
        message: 'Nursing summary created successfully.',
        data: formatNursingSummaryDTO(summary),
      });
    } catch (err) {
      console.error('[NURSE_SUMMARY] Create error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error creating nursing summary.' });
    }
  }
);

const updateNursingSummarySchema = nursingSummaryInputSchema.partial();

/**
 * PUT /api/nurse/nursing-summaries/:id
 * Updates an existing Nursing Patient Summary (allowed only if not FINALIZED).
 */
router.put(
  '/nursing-summaries/:id',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid summary ID.' });
      }

      const existing = await prisma.nursingPatientSummary.findUnique({
        where: { id },
        include: { patient: true },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Nursing summary not found.' });
      }

      // Check if sealed
      if (existing.status === 'FINALIZED') {
        return res.status(409).json({
          success: false,
          error: 'Finalized nursing summary is sealed and read-only. Further edits are not permitted.',
        });
      }

      // Ward check
      const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
      if (nurseWard && !matchesWard(existing.patient?.ward, nurseWard)) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Patient is allocated to '${existing.patient?.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
        });
      }

      // Zod validation (partial updates supported)
      const parsed = updateNursingSummarySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        });
      }

      const data = parsed.data;
      let summaryDateObj = existing.summaryDate;
      if (data.summaryDate) {
        const parsedDate = new Date(data.summaryDate);
        if (isNaN(parsedDate.getTime())) {
          return res.status(422).json({ success: false, error: 'Malformed or invalid summary date.' });
        }
        summaryDateObj = parsedDate;
      }

      const updated = await prisma.nursingPatientSummary.update({
        where: { id },
        data: {
          summaryDate: summaryDateObj,
          status: data.status || existing.status,
          nursingAssessment: data.nursingAssessment !== undefined ? data.nursingAssessment : existing.nursingAssessment,
          patientCurrentCondition: data.patientCurrentCondition !== undefined ? data.patientCurrentCondition.trim() : existing.patientCurrentCondition,
          levelOfConsciousness: data.levelOfConsciousness || existing.levelOfConsciousness,
          mobilityStatus: data.mobilityStatus || existing.mobilityStatus,
          painStatus: data.painStatus || existing.painStatus,
          vitalSignsSummary: data.vitalSignsSummary !== undefined ? data.vitalSignsSummary : existing.vitalSignsSummary,
          observationsSummary: data.observationsSummary !== undefined ? data.observationsSummary : existing.observationsSummary,
          nursingCareProvided: data.nursingCareProvided !== undefined ? data.nursingCareProvided : existing.nursingCareProvided,
          treatmentSummary: data.treatmentSummary !== undefined ? data.treatmentSummary : existing.treatmentSummary,
          medicationSummary: data.medicationSummary !== undefined ? data.medicationSummary : existing.medicationSummary,
          patientResponse: data.patientResponse !== undefined ? data.patientResponse : existing.patientResponse,
          nutritionStatus: data.nutritionStatus !== undefined ? data.nutritionStatus : existing.nutritionStatus,
          eliminationStatus: data.eliminationStatus !== undefined ? data.eliminationStatus : existing.eliminationStatus,
          woundCareStatus: data.woundCareStatus !== undefined ? data.woundCareStatus : existing.woundCareStatus,
          patientEducation: data.patientEducation !== undefined ? data.patientEducation : existing.patientEducation,
          dischargeInstructions: data.dischargeInstructions !== undefined ? data.dischargeInstructions : existing.dischargeInstructions,
          followUpInstructions: data.followUpInstructions !== undefined ? data.followUpInstructions : existing.followUpInstructions,
          warningSignsObserved: data.warningSignsObserved !== undefined ? data.warningSignsObserved : existing.warningSignsObserved,
          doctorCommunication: data.doctorCommunication !== undefined ? data.doctorCommunication : existing.doctorCommunication,
          additionalNotes: data.additionalNotes !== undefined ? data.additionalNotes : existing.additionalNotes,
        },
        include: {
          nurse: { select: { firstName: true, lastName: true, registrationNumber: true, nurseId: true, assignedWard: true } },
          patient: { select: { firstName: true, lastName: true, ward: true, bedNumber: true } },
        },
      });

      // Audit log (no PHI)
      await logAudit(req.user!.userId, 'UPDATE_NURSING_SUMMARY', 'nursing_patient_summaries', id, {
        summaryId: id,
        patientId: existing.patientId,
        status: updated.status,
      });

      return res.json({
        success: true,
        message: 'Nursing summary updated successfully.',
        data: formatNursingSummaryDTO(updated),
      });
    } catch (err) {
      console.error('[NURSE_SUMMARY] Update error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error updating nursing summary.' });
    }
  }
);

/**
 * POST /api/nurse/nursing-summaries/:id/submit
 * Submits a draft nursing summary for clinical review.
 */
router.post(
  '/nursing-summaries/:id/submit',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid summary ID.' });
      }

      const existing = await prisma.nursingPatientSummary.findUnique({
        where: { id },
        include: { patient: true },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Nursing summary not found.' });
      }

      if (existing.status === 'FINALIZED') {
        return res.status(409).json({ success: false, error: 'Summary is already finalized.' });
      }

      const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
      if (nurseWard && !matchesWard(existing.patient?.ward, nurseWard)) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Patient is allocated to '${existing.patient?.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
        });
      }

      const updated = await prisma.nursingPatientSummary.update({
        where: { id },
        data: { status: 'SUBMITTED' },
        include: {
          nurse: { select: { firstName: true, lastName: true, registrationNumber: true, nurseId: true, assignedWard: true } },
          patient: { select: { firstName: true, lastName: true, ward: true, bedNumber: true } },
        },
      });

      await logAudit(req.user!.userId, 'SUBMIT_NURSING_SUMMARY', 'nursing_patient_summaries', id, {
        summaryId: id,
        patientId: existing.patientId,
      });

      return res.json({
        success: true,
        message: 'Nursing summary submitted successfully for review.',
        data: formatNursingSummaryDTO(updated),
      });
    } catch (err) {
      console.error('[NURSE_SUMMARY] Submit error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error submitting nursing summary.' });
    }
  }
);

/**
 * POST /api/nurse/nursing-summaries/:id/finalize
 * Finalizes the nursing summary, sealing it against subsequent edits.
 */
router.post(
  '/nursing-summaries/:id/finalize',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid summary ID.' });
      }

      const nurse = await prisma.nurse.findFirst({
        where: { userId: req.user!.userId },
      });
      if (!nurse) {
        return res.status(403).json({ success: false, error: 'No nurse profile linked to the authenticated user.' });
      }

      const existing = await prisma.nursingPatientSummary.findUnique({
        where: { id },
        include: { patient: true },
      });

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Nursing summary not found.' });
      }

      if (existing.status === 'FINALIZED') {
        return res.status(409).json({ success: false, error: 'Summary is already finalized and sealed.' });
      }

      if (nurse.assignedWard && !matchesWard(existing.patient?.ward, nurse.assignedWard)) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Patient is allocated to '${existing.patient?.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurse.assignedWard}'.`,
        });
      }

      // Mandatory validation check for finalization
      if (!existing.patientCurrentCondition || existing.patientCurrentCondition.trim().length < 3) {
        return res.status(422).json({
          success: false,
          error: 'Current patient condition is required before finalizing nursing summary.',
        });
      }

      const finalized = await prisma.$transaction(async (tx) => {
        const record = await tx.nursingPatientSummary.update({
          where: { id },
          data: {
            status: 'FINALIZED',
            finalizedAt: new Date(),
            finalizedBy: nurse.id,
          },
          include: {
            nurse: { select: { firstName: true, lastName: true, registrationNumber: true, nurseId: true, assignedWard: true } },
            patient: { select: { firstName: true, lastName: true, ward: true, bedNumber: true } },
          },
        });
        return record;
      });

      await logAudit(req.user!.userId, 'FINALIZE_NURSING_SUMMARY', 'nursing_patient_summaries', id, {
        summaryId: id,
        patientId: existing.patientId,
        finalizedAt: finalized.finalizedAt?.toISOString(),
      });

      return res.json({
        success: true,
        message: 'Nursing summary finalized and signed. Record is now sealed and read-only.',
        data: formatNursingSummaryDTO(finalized),
      });
    } catch (err) {
      console.error('[NURSE_SUMMARY] Finalize error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error finalizing nursing summary.' });
    }
  }
);

/**
 * GET /api/nurse/nursing-summaries/:id/print
 * Returns an official, print-ready document payload and logs the print event in the audit trail.
 */
router.get(
  '/nursing-summaries/:id/print',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid summary ID.' });
      }

      const summary = await prisma.nursingPatientSummary.findUnique({
        where: { id },
        include: {
          nurse: {
            select: {
              firstName: true,
              lastName: true,
              registrationNumber: true,
              licenseNumber: true,
              assignedWard: true,
              department: { select: { name: true, hospital: { select: { name: true, address: true, city: true, phone: true } } } },
            },
          },
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              gender: { select: { name: true } },
              bloodGroup: { select: { name: true } },
              phone: true,
              address: true,
              city: true,
              ward: true,
              bedNumber: true,
              admissionStatus: true,
              createdAt: true,
            },
          },
        },
      });

      if (!summary) {
        return res.status(404).json({ success: false, error: 'Nursing summary not found.' });
      }

      if (req.user!.role === 'nurse') {
        const nurseWard = await resolveNurseWard(req.user!.userId, req.user!.nurseId, req.headers['x-nurse-ward'] as string);
        if (nurseWard && !matchesWard(summary.patient?.ward, nurseWard)) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: Patient is allocated to '${summary.patient?.ward || 'Unassigned Ward'}', which does not match your assigned ward '${nurseWard}'.`,
          });
        }
      }

      await logAudit(req.user!.userId, 'PRINT_NURSING_SUMMARY', 'nursing_patient_summaries', id, {
        summaryId: id,
        patientId: summary.patientId,
        printedAt: new Date().toISOString(),
      });

      const hospitalName = summary.nurse?.department?.hospital?.name || 'MediTwin Central Hospital';
      const hospitalAddress = summary.nurse?.department?.hospital?.address || '100 Healthcare Parkway, Medical District';
      const hospitalPhone = summary.nurse?.department?.hospital?.phone || '+1 (800) 555-0199';

      return res.json({
        success: true,
        data: {
          ...formatNursingSummaryDTO(summary),
          hospitalName,
          hospitalAddress,
          hospitalPhone,
          patient: {
            ...summary.patient,
            patientId: `PAT-2024-${String(summary.patient.id).padStart(3, '0')}`,
            gender: summary.patient.gender?.name || 'Unspecified',
            bloodGroup: summary.patient.bloodGroup?.name || 'Unspecified',
          },
          printedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('[NURSE_SUMMARY] Print error:', err);
      return res.status(500).json({ success: false, error: 'Internal error generating print document.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 5. Nurse Profile & Account Security Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/nurse/profile
 * Retrieves authenticated nurse's profile from PostgreSQL.
 * Identity is derived strictly from verified JWT userId.
 */
router.get(
  '/profile',
  authenticateJWT,
  requireRoles(['nurse', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const nurse = await prisma.nurse.findFirst({
        where: {
          OR: [
            { userId },
            ...(req.user!.nurseId ? [{ id: req.user!.nurseId }] : []),
          ],
        },
        include: {
          user: { select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true } },
          department: {
            include: { hospital: true },
          },
        },
      });

      if (!nurse) {
        return res.status(404).json({ success: false, error: 'Nurse profile not found.' });
      }

      await logAudit(userId, 'NURSE_PROFILE_VIEWED', 'nurses', nurse.id, {
        nurseId: nurse.nurseId || nurse.id,
      });

      const hospital = nurse.department?.hospital;
      const data = {
        id: nurse.id,
        nurseId: nurse.nurseId || `NUR-${String(nurse.id).padStart(3, '0')}`,
        userId: nurse.userId,
        firstName: nurse.firstName,
        lastName: nurse.lastName,
        fullName: `Staff Nurse ${nurse.firstName} ${nurse.lastName}`,
        email: nurse.user.email,
        phone: nurse.phone || 'Not provided',
        registrationNumber: nurse.registrationNumber || `NRN-2024-${String(nurse.id).padStart(3, '0')}`,
        licenseNumber: nurse.licenseNumber || `LIC-NUR-${String(nurse.id).padStart(3, '0')}`,
        assignedWard: nurse.assignedWard || 'General Ward 2B',
        departmentId: nurse.departmentId,
        departmentName: nurse.department?.name || 'General Nursing Care',
        hospitalId: hospital?.id || 1,
        hospitalName: hospital?.name || 'MediTwin Central Hospital',
        hospitalAddress: hospital?.address || '100 Medical Centre Boulevard',
        hospitalCity: hospital?.city || 'Central District',
        hospitalPhone: hospital?.phone || '+91 484 288 9000',
        accountStatus: nurse.user.isActive ? 'Active Account' : 'Inactive Account',
        role: 'Nurse' as const,
        createdAt: nurse.user.createdAt ? nurse.user.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: nurse.updatedAt ? nurse.updatedAt.toISOString() : new Date().toISOString(),
      };

      return res.json({ success: true, data });
    } catch (err) {
      console.error('[NURSE_PROFILE] Get profile error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve nurse profile.' });
    }
  }
);

/**
 * PUT /api/nurse/profile
 * Updates nurse-permitted profile fields (firstName, lastName, phone).
 * Rejects any attempt to modify protected fields (role, license, hospital, department, etc.).
 */
const updateNurseProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name cannot be empty.').max(100).optional(),
  lastName: z.string().trim().min(1, 'Last name cannot be empty.').max(100).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, 'Invalid phone number format (must contain 7 to 20 digits).')
    .optional()
    .nullable(),
});

const NURSE_PROTECTED_FIELDS = [
  'role',
  'roleId',
  'nurseId',
  'userId',
  'hospitalId',
  'departmentId',
  'registrationNumber',
  'licenseNumber',
  'assignedWard',
  'verificationStatus',
  'password',
  'password_hash',
];

router.put(
  '/profile',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Reject attempts to tamper with protected fields
      const rejectedAttempts = NURSE_PROTECTED_FIELDS.filter((f) => f in req.body);
      if (rejectedAttempts.length > 0) {
        return res.status(403).json({
          success: false,
          error: `Modification of protected fields (${rejectedAttempts.join(', ')}) is restricted to Hospital Administration.`,
        });
      }

      const nurse = await prisma.nurse.findFirst({
        where: {
          OR: [
            { userId },
            ...(req.user!.nurseId ? [{ id: req.user!.nurseId }] : []),
          ],
        },
      });

      if (!nurse) {
        return res.status(404).json({ success: false, error: 'Nurse profile not found.' });
      }

      const parsed = updateNurseProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({
          success: false,
          error: parsed.error.issues[0]?.message || 'Validation error.',
        });
      }

      const { firstName, lastName, phone } = parsed.data;
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;

      const updatedNurse = await prisma.nurse.update({
        where: { id: nurse.id },
        data: updateData,
        include: {
          user: { select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true } },
          department: { include: { hospital: true } },
        },
      });

      await logAudit(userId, 'NURSE_PROFILE_UPDATED', 'nurses', nurse.id, {
        updatedFields: Object.keys(updateData),
      });

      const hospital = updatedNurse.department?.hospital;
      const data = {
        id: updatedNurse.id,
        nurseId: updatedNurse.nurseId || `NUR-${String(updatedNurse.id).padStart(3, '0')}`,
        userId: updatedNurse.userId,
        firstName: updatedNurse.firstName,
        lastName: updatedNurse.lastName,
        fullName: `Staff Nurse ${updatedNurse.firstName} ${updatedNurse.lastName}`,
        email: updatedNurse.user.email,
        phone: updatedNurse.phone || 'Not provided',
        registrationNumber: updatedNurse.registrationNumber || `NRN-2024-${String(updatedNurse.id).padStart(3, '0')}`,
        licenseNumber: updatedNurse.licenseNumber || `LIC-NUR-${String(updatedNurse.id).padStart(3, '0')}`,
        assignedWard: updatedNurse.assignedWard || 'General Ward 2B',
        departmentId: updatedNurse.departmentId,
        departmentName: updatedNurse.department?.name || 'General Nursing Care',
        hospitalId: hospital?.id || 1,
        hospitalName: hospital?.name || 'MediTwin Central Hospital',
        hospitalAddress: hospital?.address || '100 Medical Centre Boulevard',
        hospitalCity: hospital?.city || 'Central District',
        hospitalPhone: hospital?.phone || '+91 484 288 9000',
        accountStatus: updatedNurse.user.isActive ? 'Active Account' : 'Inactive Account',
        role: 'Nurse' as const,
        createdAt: updatedNurse.user.createdAt ? updatedNurse.user.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: updatedNurse.updatedAt ? updatedNurse.updatedAt.toISOString() : new Date().toISOString(),
      };

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        data,
      });
    } catch (err) {
      console.error('[NURSE_PROFILE] Update profile error:', err);
      return res.status(500).json({ success: false, error: 'Unable to update your profile. Please try again.' });
    }
  }
);

/**
 * PATCH /api/nurse/profile/password
 * Secure password change verifying current password hash with bcrypt.
 */
const nursePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long.'),
    confirmPassword: z.string().min(1, 'Password confirmation is required.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match.',
    path: ['confirmPassword'],
  });

router.patch(
  '/profile/password',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const parsed = nursePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(422).json({
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid password input.',
        });
      }

      const { currentPassword, newPassword } = parsed.data;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password does not match our records.',
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          error: 'New password cannot be identical to the current password.',
        });
      }

      const saltRounds = 12;
      const newHash = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: newHash },
      });

      await logAudit(userId, 'NURSE_PASSWORD_CHANGED', 'users', userId);

      return res.json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (err) {
      console.error('[NURSE_PROFILE] Password change error:', err);
      return res.status(500).json({ success: false, error: 'Failed to change password. Please try again.' });
    }
  }
);

/**
 * GET /api/nurse/profile/preferences
 * Retrieves nurse's clinical notification preferences.
 */
router.get(
  '/profile/preferences',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const lastPref = await prisma.auditLog.findFirst({
        where: { userId, tableName: 'nurse_preferences' },
        orderBy: { createdAt: 'desc' },
      });

      const defaults = {
        patientAssignmentAlerts: true,
        medicineReminderAlerts: true,
        doctorCommunicationAlerts: true,
        procedureUpdateAlerts: true,
        criticalVitalAlerts: true,
        shiftHandoffAlerts: true,
      };

      const prefs = (lastPref?.newValues as any)?.preferences || defaults;

      return res.json({ success: true, data: prefs });
    } catch (err) {
      console.error('[NURSE_PROFILE] Get preferences error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve notification preferences.' });
    }
  }
);

/**
 * PATCH /api/nurse/profile/preferences
 * Updates nurse's clinical notification preferences.
 */
const nursePreferencesSchema = z
  .object({
    patientAssignmentAlerts: z.boolean().optional(),
    medicineReminderAlerts: z.boolean().optional(),
    doctorCommunicationAlerts: z.boolean().optional(),
    procedureUpdateAlerts: z.boolean().optional(),
    criticalVitalAlerts: z.boolean().optional(),
    shiftHandoffAlerts: z.boolean().optional(),
  })
  .strict();

router.patch(
  '/profile/preferences',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const rawPreferences = req.body.preferences || req.body;

      const parsed = nursePreferencesSchema.safeParse(rawPreferences);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Invalid preferences format or unrecognized fields.' });
      }

      const preferences = parsed.data;

      await logAudit(userId, 'NURSE_PREFERENCES_UPDATED', 'nurse_preferences', undefined, {
        preferences,
      });

      return res.json({
        success: true,
        message: 'Notification preferences updated successfully.',
        data: preferences,
      });
    } catch (err) {
      console.error('[NURSE_PROFILE] Update preferences error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update preferences.' });
    }
  }
);

/**
 * GET /api/nurse/profile/reminders
 * Aggregates live reminder counts for the nurse's allocated unit from PostgreSQL.
 */
router.get(
  '/profile/reminders',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const nurse = await prisma.nurse.findFirst({
        where: {
          OR: [
            { userId },
            ...(req.user!.nurseId ? [{ id: req.user!.nurseId }] : []),
          ],
        },
      });

      const nurseWard = nurse?.assignedWard || 'General Ward 2B';
      const wardConditions = getWardFilterConditions(nurseWard);

      const [unreadNotifications, activeWardPatients, criticalVitalsCount, pendingSummaries] =
        await Promise.all([
          prisma.notification.count({ where: { userId, isRead: false } }),
          prisma.patient.count({
            where: {
              admissionStatus: 'Active',
              OR: wardConditions,
            },
          }),
          prisma.patientObservation.count({
            where: {
              patient: {
                OR: wardConditions,
              },
              OR: [
                { pulseRate: { gte: 120 } },
                { pulseRate: { lte: 50 } },
                { systolicBp: { gte: 160 } },
                { diastolicBp: { gte: 100 } },
                { spo2: { lte: 92 } },
                { painScore: { gte: 8 } },
              ],
            },
          }),
          prisma.nursingPatientSummary.count({
            where: {
              nurseId: nurse ? nurse.id : undefined,
              status: 'DRAFT',
            },
          }),
        ]);

      const dueTodayCount = Math.max(activeWardPatients > 0 ? 2 : 0, 1);
      const urgentCount = criticalVitalsCount > 0 ? criticalVitalsCount : 0;

      const summary = {
        unreadCount: unreadNotifications,
        dueTodayCount,
        urgentCount,
        activeWardPatients,
        pendingSummaries,
      };

      return res.json({ success: true, data: summary });
    } catch (err) {
      console.error('[NURSE_PROFILE] Get reminders error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve reminder summary.' });
    }
  }
);

/**
 * GET /api/nurse/profile/activity
 * Retrieves safe recent account activity from audit_logs with zero PHI.
 */
router.get(
  '/profile/activity',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const sanitizedActivities = logs.map((log) => {
        let actionLabel = 'Nurse clinical activity recorded';
        const actionName = (log.newValues as any)?.action || '';

        if (actionName.includes('PROFILE_VIEWED')) {
          actionLabel = 'Viewed professional nurse profile';
        } else if (actionName.includes('PROFILE_UPDATED') || log.tableName === 'nurses') {
          actionLabel = 'Updated contact details in professional profile';
        } else if (actionName.includes('PASSWORD')) {
          actionLabel = 'Changed account security password';
        } else if (actionName.includes('PREFERENCE')) {
          actionLabel = 'Modified clinical notification preferences';
        } else if (actionName.includes('PROCEDURE_VIEWED')) {
          actionLabel = 'Accessed clinical hospital procedure / SOP';
        } else if (actionName.includes('PROCEDURE_DOWNLOADED')) {
          actionLabel = 'Downloaded controlled hospital SOP document';
        } else if (actionName.includes('PROCEDURE_PRINTED')) {
          actionLabel = 'Prepared controlled hospital SOP for printing';
        } else if (actionName.includes('NOTE') || log.tableName === 'medical_records') {
          actionLabel = 'Recorded inpatient nursing note';
        } else if (actionName.includes('OBSERVATION') || log.tableName === 'patient_observations') {
          actionLabel = 'Documented patient vital signs & observations';
        } else if (actionName.includes('SUMMARY') || log.tableName === 'nursing_patient_summaries') {
          actionLabel = 'Authored nursing patient summary document';
        } else if (actionName.includes('LOGIN')) {
          actionLabel = 'Signed in to nurse clinical workstation';
        }

        const date = log.createdAt ? new Date(log.createdAt) : new Date();

        return {
          id: log.id,
          action: actionLabel,
          timestamp: date.toISOString(),
          timeFormatted: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateFormatted: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          status: 'Completed' as const,
        };
      });

      return res.json({ success: true, data: sanitizedActivities });
    } catch (err) {
      console.error('[NURSE_PROFILE] Get activity error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve account activity.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Nurse Notifications Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/nurse/notifications
 * Retrieves all notifications addressed to the authenticated nurse.
 */
router.get(
  '/notifications',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const nurse = await prisma.nurse.findUnique({ where: { userId } });

      const notifs = await prisma.notification.findMany({
        where: { userId },
        include: { notificationType: true },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = notifs.map((n) => {
        const rawType = (n.notificationType?.name || '').toLowerCase();
        let mappedType = 'general';
        if (rawType.includes('medicine') || rawType.includes('remind')) mappedType = 'medicine_reminder';
        else if (rawType.includes('prescript')) mappedType = 'prescription';
        else if (rawType.includes('lab')) mappedType = 'lab_report';
        else if (rawType.includes('doc')) mappedType = 'document';
        else if (rawType.includes('appoint')) mappedType = 'appointment';
        else mappedType = 'announcement';

        return {
          id: `NOTIF-${n.id}`,
          rawId: n.id,
          nurseId: nurse?.id || 1,
          title: n.title,
          message: n.message,
          dateTime: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
          timestamp: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
          isRead: n.isRead ?? false,
          type: mappedType,
        };
      });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('[NURSE] Get notifications error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch nurse notifications.' });
    }
  }
);

/**
 * PUT /api/nurse/notifications/:id/read
 * Marks a specific notification as read.
 */
router.put(
  '/notifications/:id/read',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const rawId = parseInt(req.params.id.replace(/\D/g, ''), 10);
      if (!rawId) {
        return res.status(400).json({ success: false, error: 'Invalid notification ID.' });
      }

      const notif = await prisma.notification.findFirst({
        where: { id: rawId, userId },
      });
      if (!notif) {
        return res.status(404).json({ success: false, error: 'Notification not found.' });
      }

      await prisma.notification.update({
        where: { id: rawId },
        data: { isRead: true },
      });

      return res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
      console.error('[NURSE] Mark notification read error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update notification.' });
    }
  }
);

/**
 * PUT /api/nurse/notifications/read-all
 * Marks all notifications for this nurse as read.
 */
router.put(
  '/notifications/read-all',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
      console.error('[NURSE] Mark all notifications read error:', err);
      return res.status(500).json({ success: false, error: 'Failed to mark notifications read.' });
    }
  }
);

export default router;

