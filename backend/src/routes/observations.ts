import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────
// Zod Validation Schema
// ──────────────────────────────────────────────────────────────────
const observationSchema = z.object({
  patientId: z.number({ required_error: 'Patient ID is required.' }).int().positive(),
  observationDate: z.string().min(1, 'Observation date is required.'),
  observationTime: z.string().min(1, 'Observation time is required.'),
  temperature: z
    .number({ required_error: 'Temperature is required.' })
    .min(30, 'Temperature seems too low (min 30°C). Please verify.')
    .max(45, 'Temperature seems too high (max 45°C). Please verify.'),
  pulseRate: z
    .number({ required_error: 'Pulse rate is required.' })
    .int()
    .min(20, 'Pulse rate seems too low (min 20 bpm).')
    .max(300, 'Pulse rate seems too high (max 300 bpm).'),
  respiratoryRate: z
    .number({ required_error: 'Respiratory rate is required.' })
    .int()
    .min(4, 'Respiratory rate seems too low (min 4).')
    .max(60, 'Respiratory rate seems too high (max 60).'),
  systolicBp: z
    .number({ required_error: 'Systolic BP is required.' })
    .int()
    .min(50, 'Systolic BP seems too low (min 50 mmHg).')
    .max(300, 'Systolic BP seems too high (max 300 mmHg).'),
  diastolicBp: z
    .number({ required_error: 'Diastolic BP is required.' })
    .int()
    .min(20, 'Diastolic BP seems too low (min 20 mmHg).')
    .max(200, 'Diastolic BP seems too high (max 200 mmHg).'),
  spo2: z
    .number({ required_error: 'SpO2 is required.' })
    .min(50, 'SpO2 seems too low (min 50%).')
    .max(100, 'SpO2 cannot exceed 100%.'),
  bloodGlucose: z
    .number()
    .min(1, 'Blood glucose seems too low.')
    .max(1000, 'Blood glucose seems too high.')
    .optional()
    .nullable(),
  weight: z
    .number()
    .min(1, 'Weight seems too low.')
    .max(500, 'Weight seems too high.')
    .optional()
    .nullable(),
  painScore: z
    .number()
    .int()
    .min(0, 'Pain score must be between 0 and 10.')
    .max(10, 'Pain score must be between 0 and 10.')
    .optional()
    .nullable(),
  consciousnessLevel: z
    .enum(['Alert', 'Confused', 'Drowsy', 'Unresponsive'])
    .optional()
    .nullable(),
  generalObservation: z
    .string()
    .min(50, 'General patient observation must be at least 50 characters.')
    .max(5000)
    .refine((val) => !/\d/.test(val), 'Numbers are not allowed in general patient observation.')
    .optional()
    .nullable()
    .or(z.literal('')),
  additionalNotes: z
    .string()
    .min(50, 'Additional notes must be at least 50 characters.')
    .max(5000)
    .refine((val) => !/\d/.test(val), 'Numbers are not allowed in additional notes.')
    .optional()
    .nullable()
    .or(z.literal('')),
});

// ──────────────────────────────────────────────────────────────────
// Audit Log Helper
// ──────────────────────────────────────────────────────────────────
async function writeAuditLog(
  userId: number | null,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  recordId: number,
  oldValues: object | null,
  newValues: object | null,
  ipAddress: string
) {
  try {
    const actionType = await prisma.actionType.findFirst({ where: { name: action } });
    if (!actionType) return;
    await prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        actionTypeId: actionType.id,
        tableName: 'patient_observations',
        recordId,
        oldValues: oldValues as never,
        newValues: newValues as never,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}

// ──────────────────────────────────────────────────────────────────
// POST /api/nurse/observations
// Create a new patient observation record
// ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = observationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = parsed.data;
      const nurseId = req.user!.nurseId;

      if (!nurseId) {
        return res.status(403).json({
          success: false,
          error: 'Nurse profile not found for this user. Cannot record observations.',
        });
      }

      // Check observation date and time is not in the future (allowing 1 min grace for clock drift)
      const obsDateTime = new Date(`${data.observationDate}T${data.observationTime}`);
      if (!isNaN(obsDateTime.getTime()) && obsDateTime.getTime() > Date.now() + 60000) {
        return res.status(400).json({
          success: false,
          error: 'Observation date and time cannot run beyond current time.',
        });
      }

      // Verify patient exists
      const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const observation = await prisma.patientObservation.create({
        data: {
          patientId: data.patientId,
          nurseId,
          observationDate: new Date(data.observationDate),
          observationTime: new Date(`1970-01-01T${data.observationTime}:00Z`),
          temperature: data.temperature,
          pulseRate: data.pulseRate,
          respiratoryRate: data.respiratoryRate,
          systolicBp: data.systolicBp,
          diastolicBp: data.diastolicBp,
          spo2: data.spo2,
          bloodGlucose: data.bloodGlucose ?? null,
          weight: data.weight ?? null,
          painScore: data.painScore ?? null,
          consciousnessLevel: data.consciousnessLevel ?? null,
          generalObservation: data.generalObservation ?? null,
          additionalNotes: data.additionalNotes ?? null,
        },
        include: {
          patient: { include: { user: { select: { email: true } } } },
          nurse: true,
        },
      });

      await writeAuditLog(
        req.user!.userId || null,
        'CREATE',
        observation.id,
        null,
        { ...data },
        req.ip || ''
      );

      return res.status(201).json({
        success: true,
        message: 'Observation recorded successfully.',
        data: observation,
      });
    } catch (err) {
      console.error('[OBS] Create error:', err);
      return res.status(500).json({ success: false, error: 'Failed to create observation.' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// GET /api/nurse/observations?patientId=&date=&page=&limit=
// List all observations for a patient (with optional date filter)
// ──────────────────────────────────────────────────────────────────
router.get(
  '/',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patientId = req.query.patientId ? parseInt(req.query.patientId as string) : undefined;
      const date = req.query.date as string | undefined;
      const page = Math.max(1, parseInt((req.query.page as string) || '1'));
      const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (patientId) where.patientId = patientId;
      if (date) where.observationDate = new Date(date);

      const [observations, total] = await Promise.all([
        prisma.patientObservation.findMany({
          where,
          orderBy: [{ observationDate: 'desc' }, { observationTime: 'desc' }],
          skip,
          take: limit,
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: { select: { name: true } },
              },
            },
            nurse: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        }),
        prisma.patientObservation.count({ where }),
      ]);

      return res.json({
        success: true,
        data: observations,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('[OBS] List error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch observations.' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// GET /api/nurse/observations/:id
// Get a single observation record by ID
// ──────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

      const observation = await prisma.patientObservation.findUnique({
        where: { id },
        include: {
          patient: {
            include: {
              gender: { select: { name: true } },
              bloodGroup: { select: { name: true } },
              user: { select: { email: true } },
            },
          },
          nurse: {
            include: {
              department: { select: { name: true } },
            },
          },
        },
      });

      if (!observation) {
        return res.status(404).json({ success: false, error: 'Observation not found.' });
      }

      return res.json({ success: true, data: observation });
    } catch (err) {
      console.error('[OBS] Get error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch observation.' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// PUT /api/nurse/observations/:id
// Update an existing observation (nurse only)
// ──────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

      const existing = await prisma.patientObservation.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Observation not found.' });
      }

      const parsed = observationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = parsed.data;

      // Check observation date and time is not in the future (allowing 1 min grace for clock drift)
      const obsDateTime = new Date(`${data.observationDate}T${data.observationTime}`);
      if (!isNaN(obsDateTime.getTime()) && obsDateTime.getTime() > Date.now() + 60000) {
        return res.status(400).json({
          success: false,
          error: 'Observation date and time cannot run beyond current time.',
        });
      }

      const updated = await prisma.patientObservation.update({
        where: { id },
        data: {
          patientId: data.patientId,
          observationDate: new Date(data.observationDate),
          observationTime: new Date(`1970-01-01T${data.observationTime}:00Z`),
          temperature: data.temperature,
          pulseRate: data.pulseRate,
          respiratoryRate: data.respiratoryRate,
          systolicBp: data.systolicBp,
          diastolicBp: data.diastolicBp,
          spo2: data.spo2,
          bloodGlucose: data.bloodGlucose ?? null,
          weight: data.weight ?? null,
          painScore: data.painScore ?? null,
          consciousnessLevel: data.consciousnessLevel ?? null,
          generalObservation: data.generalObservation ?? null,
          additionalNotes: data.additionalNotes ?? null,
        },
      });

      await writeAuditLog(
        req.user!.userId || null,
        'UPDATE',
        id,
        existing as object,
        { ...data },
        req.ip || ''
      );

      return res.json({
        success: true,
        message: 'Observation updated successfully.',
        data: updated,
      });
    } catch (err) {
      console.error('[OBS] Update error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update observation.' });
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// DELETE /api/nurse/observations/:id
// Delete an observation record (nurse only) with audit log
// ──────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  authenticateJWT,
  requireRoles(['nurse']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

      const existing = await prisma.patientObservation.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Observation not found.' });
      }

      await prisma.patientObservation.delete({ where: { id } });

      await writeAuditLog(
        req.user!.userId || null,
        'DELETE',
        id,
        existing as object,
        null,
        req.ip || ''
      );

      return res.json({ success: true, message: 'Observation deleted successfully.' });
    } catch (err) {
      console.error('[OBS] Delete error:', err);
      return res.status(500).json({ success: false, error: 'Failed to delete observation.' });
    }
  }
);

export default router;
