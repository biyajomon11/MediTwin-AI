import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
const prisma = new PrismaClient();

// ── Audit Log Helper ─────────────────────────────────────────────────────────

async function logAdminProfileAudit(
  userId: number,
  eventName: string,
  tableName: string,
  recordId?: number,
  details?: Record<string, any>
) {
  try {
    const isCreate = eventName.includes('CREATE') || eventName.includes('REGISTER');
    const isUpdate = eventName.includes('UPDATE') || eventName.includes('CHANGED');
    const actionTypeName = isCreate ? 'CREATE' : isUpdate ? 'UPDATE' : 'READ';

    const actionType = await prisma.actionType.findFirst({
      where: { name: actionTypeName },
    });

    // Sanitized details - NEVER log passwords or hashes
    const sanitizedDetails = { ...(details || {}) };
    delete sanitizedDetails.password;
    delete sanitizedDetails.currentPassword;
    delete sanitizedDetails.newPassword;
    delete sanitizedDetails.confirmPassword;
    delete sanitizedDetails.password_hash;

    await prisma.auditLog.create({
      data: {
        userId,
        actionTypeId: actionType?.id || (isCreate ? 1 : isUpdate ? 3 : 2),
        tableName,
        recordId: recordId || null,
        newValues: {
          event: eventName,
          ...sanitizedDetails,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('[AUDIT_LOG] Error recording admin profile audit log:', err);
  }
}

// ── Validation Schemas ───────────────────────────────────────────────────────

const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

const updateProfileSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required.' })
    .trim()
    .min(1, 'First name cannot be empty.')
    .max(100, 'First name cannot exceed 100 characters.'),
  lastName: z
    .string({ required_error: 'Last name is required.' })
    .trim()
    .min(1, 'Last name cannot be empty.')
    .max(100, 'Last name cannot exceed 100 characters.'),
  phone: z
    .string()
    .trim()
    .refine((val) => val === '' || phoneRegex.test(val), {
      message: 'Please provide a valid telephone number format.',
    })
    .nullable()
    .optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
    confirmPassword: z.string().min(1, 'Password confirmation is required.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation password do not match.',
    path: ['confirmPassword'],
  });

const preferencesSchema = z.object({
  appointmentAlerts: z.boolean().optional(),
  staffRosterAlerts: z.boolean().optional(),
  departmentAlerts: z.boolean().optional(),
  hospitalPolicyAlerts: z.boolean().optional(),
  clinicalGuidelineAlerts: z.boolean().optional(),
  systemMaintenanceAlerts: z.boolean().optional(),
  reportGenerationAlerts: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

// Protected administrative fields that must never be modified through profile update
const PROTECTED_FIELDS = [
  'role',
  'roleId',
  'hospitalId',
  'adminId',
  'userId',
  'id',
  'permissions',
  'isSystemAdmin',
  'password',
  'password_hash',
  'isActive',
  'email',
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/admin/profile
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      // Resolve authenticated administrator strictly from JWT identity
      const admin = await prisma.admin.findFirst({
        where: {
          OR: [
            { userId: userId },
            ...(req.user?.adminId ? [{ id: req.user.adminId }] : []),
          ],
        },
        include: {
          user: {
            include: { role: true },
          },
          hospital: true,
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Administrator profile not found.',
        });
      }

      // Safe sanitized profile object - NEVER return password_hash or internal secrets
      const profile = {
        id: admin.id,
        adminId: admin.id,
        userId: admin.userId,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: `${admin.firstName} ${admin.lastName}`.trim(),
        email: admin.user.email,
        phone: admin.phone || null,
        designation: 'Hospital Administrator',
        role: admin.user.role.name,
        roleId: admin.user.roleId,
        isActive: admin.user.isActive ?? true,
        createdAt: admin.createdAt,
        hospital: admin.hospital
          ? {
              id: admin.hospital.id,
              name: admin.hospital.name,
              address: admin.hospital.address,
              city: admin.hospital.city,
              state: admin.hospital.state,
              phone: admin.hospital.phone,
              email: admin.hospital.email,
              createdAt: admin.hospital.createdAt,
            }
          : null,
      };

      await logAdminProfileAudit(userId, 'ADMIN_PROFILE_VIEWED', 'admins', admin.id);

      return res.json({ success: true, data: profile });
    } catch (err: any) {
      console.error('[ADMIN_PROFILE] Get profile error:', err);
      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve administrator profile. Please try again.',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. PUT /api/admin/profile
// ─────────────────────────────────────────────────────────────────────────────

router.put(
  '/',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      // Reject attempts to modify protected administrative fields
      const submittedKeys = Object.keys(req.body || {});
      const hasProtectedFields = submittedKeys.some((k) => PROTECTED_FIELDS.includes(k));
      if (hasProtectedFields) {
        const found = submittedKeys.filter((k) => PROTECTED_FIELDS.includes(k));
        return res.status(403).json({
          success: false,
          error: `Modification of protected fields (${found.join(', ')}) is strictly prohibited.`,
        });
      }

      // Validate inputs
      const parseResult = updateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMsg = parseResult.error.issues[0]?.message || 'Please correct the highlighted fields.';
        return res.status(422).json({
          success: false,
          error: errorMsg,
          errors: parseResult.error.flatten().fieldErrors,
        });
      }

      const { firstName, lastName, phone } = parseResult.data;

      // Find the authenticated admin
      const admin = await prisma.admin.findFirst({
        where: {
          OR: [
            { userId: userId },
            ...(req.user?.adminId ? [{ id: req.user.adminId }] : []),
          ],
        },
        include: {
          user: { include: { role: true } },
          hospital: true,
        },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Administrator profile not found.',
        });
      }

      // Explicitly construct update data - protects against mass assignment
      const updatedAdmin = await prisma.admin.update({
        where: { id: admin.id },
        data: {
          firstName,
          lastName,
          phone: phone && phone.trim() !== '' ? phone.trim() : null,
        },
        include: {
          user: { include: { role: true } },
          hospital: true,
        },
      });

      await logAdminProfileAudit(userId, 'ADMIN_PROFILE_UPDATED', 'admins', admin.id, {
        oldValues: {
          firstName: admin.firstName,
          lastName: admin.lastName,
          phone: admin.phone,
        },
        newValues: {
          firstName: updatedAdmin.firstName,
          lastName: updatedAdmin.lastName,
          phone: updatedAdmin.phone,
        },
      });

      const profile = {
        id: updatedAdmin.id,
        adminId: updatedAdmin.id,
        userId: updatedAdmin.userId,
        firstName: updatedAdmin.firstName,
        lastName: updatedAdmin.lastName,
        fullName: `${updatedAdmin.firstName} ${updatedAdmin.lastName}`.trim(),
        email: updatedAdmin.user.email,
        phone: updatedAdmin.phone || null,
        designation: 'Hospital Administrator',
        role: updatedAdmin.user.role.name,
        roleId: updatedAdmin.user.roleId,
        isActive: updatedAdmin.user.isActive ?? true,
        createdAt: updatedAdmin.createdAt,
        hospital: updatedAdmin.hospital
          ? {
              id: updatedAdmin.hospital.id,
              name: updatedAdmin.hospital.name,
              address: updatedAdmin.hospital.address,
              city: updatedAdmin.hospital.city,
              state: updatedAdmin.hospital.state,
              phone: updatedAdmin.hospital.phone,
              email: updatedAdmin.hospital.email,
              createdAt: updatedAdmin.hospital.createdAt,
            }
          : null,
      };

      return res.json({
        success: true,
        message: 'Administrator profile updated successfully.',
        data: profile,
      });
    } catch (err: any) {
      console.error('[ADMIN_PROFILE] Update profile error:', err);
      return res.status(500).json({
        success: false,
        error: 'Unable to update administrator profile. Please try again.',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. PATCH /api/admin/profile/password
// ─────────────────────────────────────────────────────────────────────────────

router.patch(
  '/password',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const parseResult = changePasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMsg = parseResult.error.issues[0]?.message || 'Invalid password input.';
        return res.status(422).json({
          success: false,
          error: errorMsg,
          errors: parseResult.error.flatten().fieldErrors,
        });
      }

      const { currentPassword, newPassword } = parseResult.data;

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }

      // Verify current password with bcrypt
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password does not match our records.',
        });
      }

      // Prevent reuse of identical password
      if (currentPassword === newPassword) {
        return res.status(422).json({
          success: false,
          error: 'New password cannot be identical to the current password.',
        });
      }

      // Hash with bcrypt salt rounds = 12
      const saltRounds = 12;
      const newHash = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: newHash },
      });

      // Audit log - NEVER log the password or hash
      await logAdminProfileAudit(userId, 'ADMIN_PASSWORD_CHANGED', 'users', userId, {
        action: 'PASSWORD_CHANGE_SUCCESS',
      });

      return res.json({
        success: true,
        message: 'Password changed successfully. Please remember your new password for future logins.',
      });
    } catch (err: any) {
      console.error('[ADMIN_PROFILE] Password change error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to change password. Please try again.',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/admin/profile/preferences & PATCH /api/admin/profile/preferences
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ADMIN_PREFERENCES = {
  appointmentAlerts: true,
  staffRosterAlerts: true,
  departmentAlerts: true,
  hospitalPolicyAlerts: true,
  clinicalGuidelineAlerts: true,
  systemMaintenanceAlerts: true,
  reportGenerationAlerts: true,
  emailNotifications: true,
};

router.get(
  '/preferences',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const lastPref = await prisma.auditLog.findFirst({
        where: { userId, tableName: 'admin_preferences' },
        orderBy: { createdAt: 'desc' },
      });

      const prefs = (lastPref?.newValues as any)?.preferences || DEFAULT_ADMIN_PREFERENCES;

      return res.json({ success: true, data: prefs });
    } catch (err: any) {
      console.error('[ADMIN_PROFILE] Get preferences error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve notification preferences.',
      });
    }
  }
);

router.patch(
  '/preferences',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const rawPreferences = req.body.preferences || req.body;
      const parseResult = preferencesSchema.safeParse(rawPreferences);
      if (!parseResult.success) {
        return res.status(422).json({
          success: false,
          error: 'Invalid notification preferences format.',
        });
      }

      // Fetch existing or use defaults
      const lastPref = await prisma.auditLog.findFirst({
        where: { userId, tableName: 'admin_preferences' },
        orderBy: { createdAt: 'desc' },
      });
      const current = (lastPref?.newValues as any)?.preferences || DEFAULT_ADMIN_PREFERENCES;
      const merged = { ...current, ...parseResult.data };

      await logAdminProfileAudit(userId, 'ADMIN_PREFERENCES_UPDATED', 'admin_preferences', undefined, {
        preferences: merged,
      });

      return res.json({
        success: true,
        message: 'Notification preferences updated successfully.',
        data: merged,
      });
    } catch (err: any) {
      console.error('[ADMIN_PROFILE] Update preferences error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences.',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/admin/profile/activity
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  '/activity',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const limit = Math.min(30, parseInt((req.query.limit as string) || '15', 10));

      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { actionType: true },
      });

      const formatted = logs.map((log) => {
        const details = (log.newValues as any) || {};
        const eventName = details.event || details.action || log.actionType?.name || 'ADMIN_ACTION';

        // Human-readable labels
        let title = eventName;
        if (eventName.includes('PROFILE_VIEWED')) title = 'Viewed Administrator Profile';
        else if (eventName.includes('PROFILE_UPDATED')) title = 'Updated Profile Information';
        else if (eventName.includes('PASSWORD_CHANGED')) title = 'Changed Account Security Password';
        else if (eventName.includes('PREFERENCES_UPDATED')) title = 'Updated Notification Preferences';
        else if (eventName.includes('ANALYTICS_VIEWED')) title = 'Accessed Department Analytics';
        else if (eventName.includes('ANALYTICS_EXPORTED')) title = 'Exported Department Analytics CSV';
        else if (eventName.includes('REPORT_GENERATED')) title = 'Generated Administrative Report';
        else if (eventName.includes('NOTIFICATION')) title = 'Published Hospital Announcement';
        else if (eventName.includes('LOGIN')) title = 'Logged In to Administrator Session';
        else if (eventName.includes('LOGOUT')) title = 'Logged Out of Session';

        const createdAt = log.createdAt || new Date();
        const dateObj = createdAt instanceof Date ? createdAt : new Date(createdAt);

        return {
          id: log.id,
          action: title,
          rawAction: eventName,
          table: log.tableName,
          timestamp: dateObj.toISOString(),
          dateFormatted: dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          timeFormatted: dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: 'Completed',
        };
      });

      return res.json({ success: true, data: formatted });
    } catch (err: any) {
      console.error('[ADMIN_PROFILE] Activity error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve administrative activity.',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/admin/profile/logout
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/logout',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await logAdminProfileAudit(userId, 'ADMIN_LOGGED_OUT', 'users', userId, {
          action: 'LOGOUT',
        });
      }
      return res.json({
        success: true,
        message: 'Administrator logged out successfully.',
      });
    } catch (err: any) {
      console.error('[ADMIN_PROFILE] Logout error:', err);
      return res.status(500).json({ success: false, error: 'Logout failed.' });
    }
  }
);

export default router;
