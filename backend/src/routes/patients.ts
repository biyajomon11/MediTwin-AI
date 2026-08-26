import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/nurse/patients
 * Search/list patients for the nurse patient-selection UI.
 * Supports optional ?search= (name or email) query param.
 */
router.get(
  '/',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const search = (req.query.search as string | undefined)?.trim();
      const page  = Math.max(1, parseInt((req.query.page  as string) || '1'));
      const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
      const skip  = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName:  { contains: search, mode: 'insensitive' as const } },
              { user: { email: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {};

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          select: {
            id:          true,
            firstName:   true,
            lastName:    true,
            dateOfBirth: true,
            phone:       true,
            gender:      { select: { name: true } },
            bloodGroup:  { select: { name: true } },
            user:        { select: { email: true } },
          },
        }),
        prisma.patient.count({ where }),
      ]);

      // Calculate age from dateOfBirth
      const now = new Date();
      const enriched = patients.map((p) => {
        const dob  = new Date(p.dateOfBirth);
        const age  = now.getFullYear() - dob.getFullYear() -
          (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
        return { ...p, age };
      });

      return res.json({
        success: true,
        data: enriched,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('[PATIENTS] List error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch patients.' });
    }
  }
);

/**
 * GET /api/nurse/patients/:id
 * Get a single patient's full profile for the patient info card.
 */
router.get(
  '/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid patient ID.' });
      }

      const patient = await prisma.patient.findUnique({
        where: { id },
        select: {
          id:          true,
          firstName:   true,
          lastName:    true,
          dateOfBirth: true,
          phone:       true,
          address:     true,
          city:        true,
          state:       true,
          emergencyContactName:  true,
          emergencyContactPhone: true,
          gender:     { select: { name: true } },
          bloodGroup: { select: { name: true } },
          user:       { select: { email: true } },
        },
      });

      if (!patient) {
        return res.status(404).json({ success: false, error: 'Patient not found.' });
      }

      const dob = new Date(patient.dateOfBirth);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear() -
        (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

      return res.json({ success: true, data: { ...patient, age } });
    } catch (err) {
      console.error('[PATIENTS] Get error:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch patient.' });
    }
  }
);

export default router;
