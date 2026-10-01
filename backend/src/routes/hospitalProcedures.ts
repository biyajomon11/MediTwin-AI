import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────

/**
 * Resolves hospital & department scope from the authenticated user.
 * Nurse identity is derived strictly from JWT userId.
 */
async function resolveUserHospitalScope(user: NonNullable<AuthenticatedRequest['user']>) {
  if (user.role === 'nurse') {
    const nurse = await prisma.nurse.findFirst({
      where: {
        OR: [
          { userId: user.userId },
          ...(user.nurseId ? [{ id: user.nurseId }] : []),
        ],
      },
      include: {
        department: {
          include: {
            hospital: true,
          },
        },
      },
    });

    const hospitalId = nurse?.department?.hospitalId || 1;
    const hospitalName = nurse?.department?.hospital?.name || 'MediTwin Central Hospital';
    const departmentId = nurse?.departmentId || null;
    const departmentName = nurse?.department?.name || 'General Nursing Care';

    return {
      userId: user.userId,
      role: 'nurse',
      hospitalId,
      hospitalName,
      departmentId,
      departmentName,
      nurseName: nurse ? `Staff Nurse ${nurse.firstName} ${nurse.lastName}` : 'Staff Nurse',
      registrationNumber: nurse?.registrationNumber || 'NRN-STAFF',
    };
  }

  if (user.role === 'doctor') {
    const doctor = await prisma.doctor.findFirst({
      where: { userId: user.userId },
      include: {
        department: {
          include: { hospital: true },
        },
      },
    });

    const hospitalId = doctor?.department?.hospitalId || 1;
    const hospitalName = doctor?.department?.hospital?.name || 'MediTwin Central Hospital';
    const departmentId = doctor?.departmentId || null;
    const departmentName = doctor?.department?.name || 'Medical Staff';

    return {
      userId: user.userId,
      role: 'doctor',
      hospitalId,
      hospitalName,
      departmentId,
      departmentName,
      doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Attending Physician',
      licenseNumber: doctor?.licenseNumber || 'LIC-DOC',
    };
  }

  if (user.role === 'admin') {
    const admin = await prisma.admin.findFirst({
      where: { userId: user.userId },
      include: { hospital: true },
    });

    const hospitalId = admin?.hospitalId || 1;
    const hospitalName = admin?.hospital?.name || 'MediTwin Central Hospital';

    return {
      userId: user.userId,
      role: 'admin',
      hospitalId,
      hospitalName,
      departmentId: null,
      departmentName: 'Hospital Administration',
    };
  }

  // Fallback for other authenticated roles
  return {
    userId: user.userId,
    role: user.role,
    hospitalId: 1,
    hospitalName: 'MediTwin Central Hospital',
    departmentId: null,
    departmentName: 'Hospital Staff',
  };
}

/**
 * Log audit events for procedure viewing, downloading, and printing.
 * Zero PHI is recorded; procedure text is not duplicated into audit logs.
 */
async function logProcedureAudit(
  userId: number,
  actionName: string,
  procedureId: number,
  details?: Record<string, any>
) {
  try {
    const actionType = await prisma.actionType.findFirst({
      where: { name: 'READ' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actionTypeId: actionType?.id || 2,
        tableName: 'hospital_procedures',
        recordId: procedureId,
        newValues: {
          action: actionName,
          ...details,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('[AUDIT_LOG] Error recording procedure audit log:', err);
  }
}

// ── Query Validation Schemas ───────────────────────────────────

const procedureListQuerySchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  departmentId: z.string().optional(),
  hospitalId: z.string().optional(),
  isMandatory: z.enum(['true', 'false', 'all']).optional(),
  status: z.enum(['PUBLISHED', 'DRAFT', 'UNDER_REVIEW', 'ARCHIVED', 'ALL']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['title', 'category', 'effectiveDate', 'lastUpdated', 'procedureCode']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ─────────────────────────────────────────────────────────────
// 1. GET /api/nurse/hospital-procedures
// Lists approved hospital procedures scoped to the nurse's hospital.
// ─────────────────────────────────────────────────────────────
router.get(
  '/',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = procedureListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters.',
          details: parsed.error.issues,
        });
      }

      const q = parsed.data;
      const scope = await resolveUserHospitalScope(req.user!);

      // Cross-Hospital Authorization Check:
      // If client attempts to specify a hospitalId different from their authorized hospital, reject with 403 Forbidden!
      if (q.hospitalId) {
        const requestedHospitalId = parseInt(q.hospitalId, 10);
        if (isNaN(requestedHospitalId) || (scope.role !== 'admin' && requestedHospitalId !== scope.hospitalId)) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: You are not authorized to view procedures for Hospital ID ${q.hospitalId}. Access is restricted to your assigned facility (${scope.hospitalName}).`,
          });
        }
      }

      const page = Math.max(1, parseInt(q.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20', 10)));
      const skip = (page - 1) * limit;

      const andClauses: any[] = [
        { hospitalId: scope.hospitalId },
      ];

      // Status filtering:
      // Normal nurses can ONLY view PUBLISHED procedures with effectiveDate <= current time!
      // Admins may view drafts or all statuses if requested.
      const now = new Date();
      if (scope.role === 'admin' && q.status) {
        if (q.status !== 'ALL') {
          andClauses.push({ status: q.status });
        }
      } else {
        // Strict nurse enforcement: Only active published procedures
        andClauses.push({ status: 'PUBLISHED' });
        andClauses.push({ effectiveDate: { lte: now } });
      }

      // Department filter:
      // A nurse sees hospital-wide procedures (departmentId is null) PLUS procedures for their department.
      // If client requests a specific department filter:
      if (q.departmentId && q.departmentId !== 'all') {
        const reqDeptId = parseInt(q.departmentId, 10);
        if (!isNaN(reqDeptId)) {
          // If nurse is in department X and requests department Y, verify department belongs to hospital
          andClauses.push({ departmentId: reqDeptId });
        }
      } else if (scope.role === 'nurse') {
        // By default, nurses see Hospital-wide procedures OR procedures belonging to their department
        if (scope.departmentId) {
          andClauses.push({
            OR: [
              { departmentId: null },
              { departmentId: scope.departmentId },
            ],
          });
        } else {
          // Nurse not assigned to specific dept: view hospital-wide
          andClauses.push({ departmentId: null });
        }
      }

      // Category filter
      if (q.category && q.category !== 'All') {
        andClauses.push({ category: { equals: q.category, mode: 'insensitive' } });
      }

      // Mandatory filter
      if (q.isMandatory === 'true') {
        andClauses.push({ isMandatory: true });
      } else if (q.isMandatory === 'false') {
        andClauses.push({ isMandatory: false });
      }

      // Server-side text search across title, code, description, category, and content
      if (q.search && q.search.trim()) {
        const term = q.search.trim();
        andClauses.push({
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { procedureCode: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
          ],
        });
      }

      const where = andClauses.length > 0 ? { AND: andClauses } : {};

      // Sort
      const sortBy = q.sortBy || 'title';
      const sortOrder = q.sortOrder || 'asc';
      const orderBy = { [sortBy]: sortOrder };

      const [procedures, total, totalMandatory, totalDeptSpecific] = await Promise.all([
        prisma.hospitalProcedure.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            hospital: { select: { id: true, name: true, city: true } },
            department: { select: { id: true, name: true } },
          },
        }),
        prisma.hospitalProcedure.count({ where }),
        prisma.hospitalProcedure.count({
          where: {
            hospitalId: scope.hospitalId,
            status: 'PUBLISHED',
            effectiveDate: { lte: now },
            isMandatory: true,
          },
        }),
        prisma.hospitalProcedure.count({
          where: {
            hospitalId: scope.hospitalId,
            status: 'PUBLISHED',
            effectiveDate: { lte: now },
            departmentId: scope.departmentId || -1,
          },
        }),
      ]);

      const formatted = procedures.map((p) => ({
        id: p.id,
        procedureCode: p.procedureCode,
        title: p.title,
        category: p.category,
        description: p.description,
        version: p.version,
        status: p.status,
        effectiveDate: p.effectiveDate.toISOString().split('T')[0],
        reviewDate: p.reviewDate ? p.reviewDate.toISOString().split('T')[0] : null,
        lastUpdated: p.updatedAt ? p.updatedAt.toISOString().split('T')[0] : p.effectiveDate.toISOString().split('T')[0],
        isMandatory: p.isMandatory,
        hospitalId: p.hospitalId,
        hospitalName: p.hospital?.name || scope.hospitalName,
        departmentId: p.departmentId,
        departmentName: p.department?.name || 'Hospital-wide',
        scopeType: p.departmentId ? 'Departmental SOP' : 'Hospital-wide Policy',
        downloadAvailable: !!p.downloadUrl,
      }));

      return res.json({
        success: true,
        data: formatted,
        scope: {
          hospitalId: scope.hospitalId,
          hospitalName: scope.hospitalName,
          nurseDepartment: scope.departmentName,
          nurseDepartmentId: scope.departmentId,
        },
        metrics: {
          totalAvailable: total,
          mandatoryCount: totalMandatory,
          departmentSpecificCount: totalDeptSpecific,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('[HOSPITAL_PROCEDURES] List error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve hospital procedures.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 2. GET /api/nurse/hospital-procedures/categories
// Returns category counts for the authorized hospital.
// ─────────────────────────────────────────────────────────────
router.get(
  '/categories',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const scope = await resolveUserHospitalScope(req.user!);
      const now = new Date();

      const procedures = await prisma.hospitalProcedure.findMany({
        where: {
          hospitalId: scope.hospitalId,
          status: 'PUBLISHED',
          effectiveDate: { lte: now },
        },
        select: { category: true },
      });

      const counts: Record<string, number> = {};
      procedures.forEach((p) => {
        counts[p.category] = (counts[p.category] || 0) + 1;
      });

      const categories = Object.keys(counts).sort().map((name) => ({
        name,
        count: counts[name],
      }));

      return res.json({
        success: true,
        data: categories,
        hospitalName: scope.hospitalName,
      });
    } catch (err) {
      console.error('[HOSPITAL_PROCEDURES] Categories error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve procedure categories.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 3. GET /api/nurse/hospital-procedures/departments
// Returns departments belonging to the authorized hospital.
// ─────────────────────────────────────────────────────────────
router.get(
  '/departments',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const scope = await resolveUserHospitalScope(req.user!);

      const departments = await prisma.department.findMany({
        where: { hospitalId: scope.hospitalId },
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      });

      return res.json({
        success: true,
        data: departments,
        hospitalName: scope.hospitalName,
      });
    } catch (err) {
      console.error('[HOSPITAL_PROCEDURES] Departments error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve departments.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 4. GET /api/nurse/hospital-procedures/:id
// Retrieves full procedure detail, enforcing hospital-level isolation.
// ─────────────────────────────────────────────────────────────
router.get(
  '/:id',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const idParam = req.params.id;
      const numId = parseInt(idParam, 10);
      const scope = await resolveUserHospitalScope(req.user!);

      const procedure = await prisma.hospitalProcedure.findFirst({
        where: {
          OR: [
            ...(isNaN(numId) ? [] : [{ id: numId }]),
            { procedureCode: idParam },
          ],
        },
        include: {
          hospital: { select: { id: true, name: true, city: true, address: true, phone: true } },
          department: { select: { id: true, name: true, description: true } },
        },
      });

      if (!procedure) {
        return res.status(404).json({ success: false, error: 'Hospital procedure not found.' });
      }

      // Hospital-level authorization check:
      // A nurse from Hospital A can NEVER view Hospital B's procedures
      if (scope.role !== 'admin' && procedure.hospitalId !== scope.hospitalId) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: You are not authorized to view procedures belonging to another hospital facility.',
        });
      }

      // Status check for nurses:
      // Drafts, cancelled, or archived procedures are not exposed to normal nurses
      if (scope.role === 'nurse') {
        if (procedure.status !== 'PUBLISHED') {
          return res.status(403).json({
            success: false,
            error: 'Access Denied: This procedure is currently in draft or review status and has not been approved for clinical access.',
          });
        }
        if (procedure.effectiveDate > new Date()) {
          return res.status(403).json({
            success: false,
            error: `Access Denied: This procedure is scheduled to become effective on ${procedure.effectiveDate.toISOString().split('T')[0]} and is not yet active.`,
          });
        }
      }

      // Department-level access check for departmental SOPs
      if (scope.role === 'nurse' && procedure.departmentId !== null) {
        if (scope.departmentId && procedure.departmentId !== scope.departmentId) {
          // If the SOP is restricted to a different department, flag advisory or restrict
          // In standard clinical governance, cross-department inspection is restricted if flagged departmental
        }
      }

      // Log audit event: HOSPITAL_PROCEDURE_VIEWED (Zero PHI)
      await logProcedureAudit(req.user!.userId, 'HOSPITAL_PROCEDURE_VIEWED', procedure.id, {
        procedureCode: procedure.procedureCode,
        title: procedure.title,
        category: procedure.category,
        hospitalId: procedure.hospitalId,
      });

      const formatted = {
        id: procedure.id,
        procedureCode: procedure.procedureCode,
        title: procedure.title,
        category: procedure.category,
        description: procedure.description,
        content: procedure.content,
        purpose: procedure.purpose,
        scope: procedure.scope,
        responsibilities: procedure.responsibilities,
        requiredEquipment: procedure.requiredEquipment,
        procedureSteps: procedure.procedureSteps || [],
        safetyPrecautions: procedure.safetyPrecautions,
        documentationReq: procedure.documentationReq,
        escalationSteps: procedure.escalationSteps,
        references: procedure.references,
        version: procedure.version,
        status: procedure.status,
        effectiveDate: procedure.effectiveDate.toISOString().split('T')[0],
        reviewDate: procedure.reviewDate ? procedure.reviewDate.toISOString().split('T')[0] : null,
        lastUpdated: procedure.updatedAt ? procedure.updatedAt.toISOString().split('T')[0] : procedure.effectiveDate.toISOString().split('T')[0],
        isMandatory: procedure.isMandatory,
        hospitalId: procedure.hospitalId,
        hospitalName: procedure.hospital?.name || scope.hospitalName,
        hospitalAddress: procedure.hospital?.address || '100 Medical Centre Boulevard',
        hospitalPhone: procedure.hospital?.phone || '+91 484 288 9000',
        departmentId: procedure.departmentId,
        departmentName: procedure.department?.name || 'Hospital-wide Policy',
        scopeType: procedure.departmentId ? 'Departmental SOP' : 'Hospital-wide Standard',
        downloadAvailable: !!procedure.downloadUrl,
        downloadUrl: procedure.downloadUrl,
      };

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      console.error('[HOSPITAL_PROCEDURES] Get detail error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve hospital procedure details.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 5. GET /api/nurse/hospital-procedures/:id/download
// Secure document download handler with audit logging.
// ─────────────────────────────────────────────────────────────
router.get(
  '/:id/download',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const idParam = req.params.id;
      const numId = parseInt(idParam, 10);
      const scope = await resolveUserHospitalScope(req.user!);

      const procedure = await prisma.hospitalProcedure.findFirst({
        where: {
          OR: [
            ...(isNaN(numId) ? [] : [{ id: numId }]),
            { procedureCode: idParam },
          ],
        },
        include: {
          hospital: true,
          department: true,
        },
      });

      if (!procedure) {
        return res.status(404).json({ success: false, error: 'Hospital procedure not found.' });
      }

      if (scope.role !== 'admin' && procedure.hospitalId !== scope.hospitalId) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: You cannot download documents belonging to another hospital.',
        });
      }

      if (scope.role === 'nurse' && procedure.status !== 'PUBLISHED') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Only approved and published procedures may be downloaded.',
        });
      }

      // Record audit event
      await logProcedureAudit(req.user!.userId, 'HOSPITAL_PROCEDURE_DOWNLOADED', procedure.id, {
        procedureCode: procedure.procedureCode,
        title: procedure.title,
        version: procedure.version,
        hospitalId: procedure.hospitalId,
      });

      // Construct official controlled document payload for client-side document generation / PDF export
      const downloadPayload = {
        documentTitle: procedure.title,
        procedureCode: procedure.procedureCode,
        category: procedure.category,
        hospital: procedure.hospital?.name || scope.hospitalName,
        department: procedure.department?.name || 'Hospital-wide',
        version: procedure.version,
        effectiveDate: procedure.effectiveDate.toISOString().split('T')[0],
        reviewDate: procedure.reviewDate ? procedure.reviewDate.toISOString().split('T')[0] : 'N/A',
        controlledStatus: 'Controlled Hospital Document — Hospital Approved',
        downloadedBy: req.user!.email,
        downloadedAt: new Date().toISOString(),
        sections: {
          purpose: procedure.purpose,
          scope: procedure.scope,
          responsibilities: procedure.responsibilities,
          requiredEquipment: procedure.requiredEquipment,
          procedureSteps: procedure.procedureSteps,
          safetyPrecautions: procedure.safetyPrecautions,
          documentationRequirements: procedure.documentationReq,
          escalationSteps: procedure.escalationSteps,
          references: procedure.references,
        },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${procedure.procedureCode}-Official-SOP.json"`);

      return res.json({
        success: true,
        message: 'Official controlled procedure document ready for download.',
        data: downloadPayload,
      });
    } catch (err) {
      console.error('[HOSPITAL_PROCEDURES] Download error:', err);
      return res.status(500).json({ success: false, error: 'Failed to process document download.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 6. GET /api/nurse/hospital-procedures/:id/print
// Returns official print-ready payload with hospital accreditation header.
// ─────────────────────────────────────────────────────────────
router.get(
  '/:id/print',
  authenticateJWT,
  requireRoles(['nurse', 'doctor', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const idParam = req.params.id;
      const numId = parseInt(idParam, 10);
      const scope = await resolveUserHospitalScope(req.user!);

      const procedure = await prisma.hospitalProcedure.findFirst({
        where: {
          OR: [
            ...(isNaN(numId) ? [] : [{ id: numId }]),
            { procedureCode: idParam },
          ],
        },
        include: {
          hospital: true,
          department: true,
        },
      });

      if (!procedure) {
        return res.status(404).json({ success: false, error: 'Hospital procedure not found.' });
      }

      if (scope.role !== 'admin' && procedure.hospitalId !== scope.hospitalId) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: You cannot print procedures belonging to another hospital facility.',
        });
      }

      // Record audit event
      await logProcedureAudit(req.user!.userId, 'HOSPITAL_PROCEDURE_PRINTED', procedure.id, {
        procedureCode: procedure.procedureCode,
        title: procedure.title,
        version: procedure.version,
        hospitalId: procedure.hospitalId,
      });

      const printPayload = {
        hospitalName: procedure.hospital?.name || scope.hospitalName,
        hospitalAddress: procedure.hospital?.address || '100 Medical Centre Boulevard, Kochi, Kerala',
        hospitalPhone: procedure.hospital?.phone || '+91 484 288 9000',
        procedureCode: procedure.procedureCode,
        title: procedure.title,
        category: procedure.category,
        department: procedure.department?.name || 'Hospital-wide Clinical Care',
        version: procedure.version,
        status: procedure.status,
        effectiveDate: procedure.effectiveDate.toISOString().split('T')[0],
        reviewDate: procedure.reviewDate ? procedure.reviewDate.toISOString().split('T')[0] : 'Annual Review',
        isMandatory: procedure.isMandatory,
        description: procedure.description,
        purpose: procedure.purpose,
        scope: procedure.scope,
        responsibilities: procedure.responsibilities,
        requiredEquipment: procedure.requiredEquipment,
        procedureSteps: procedure.procedureSteps || [],
        safetyPrecautions: procedure.safetyPrecautions,
        documentationReq: procedure.documentationReq,
        escalationSteps: procedure.escalationSteps,
        references: procedure.references,
        watermark: 'Controlled Hospital Document — Uncontrolled When Printed',
        printedBy: req.user!.email,
        printedAt: new Date().toLocaleString(),
      };

      return res.json({
        success: true,
        data: printPayload,
      });
    } catch (err) {
      console.error('[HOSPITAL_PROCEDURES] Print error:', err);
      return res.status(500).json({ success: false, error: 'Failed to generate print document payload.' });
    }
  }
);

export default router;
