import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
const prisma = new PrismaClient();

// ── Audit Log Helper ─────────────────────────────────────────────────────────

async function logAnalyticsAudit(
  userId: number,
  eventName: string,
  hospitalId: number,
  details: Record<string, any>,
  recordId?: number
) {
  try {
    const actionType = await prisma.actionType.findFirst({
      where: { name: 'READ' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actionTypeId: actionType?.id || 2,
        tableName: 'departments',
        recordId: recordId || null,
        newValues: {
          event: eventName,
          hospitalId,
          ...details,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('[AUDIT_LOG] Error recording analytics audit log:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Department Analytics Data Endpoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/analytics/departments
 * Aggregates live department-level hospital operations from PostgreSQL.
 * Strict RBAC (Admin only) & Hospital Scope Enforcement.
 */
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

      // ── Resolve Administrator Hospital Scope ──
      const admin = await prisma.admin.findFirst({
        where: {
          OR: [
            { userId: userId },
            ...(req.user?.adminId ? [{ id: req.user.adminId }] : []),
          ],
        },
        include: { hospital: true },
      });

      if (!admin || !admin.hospitalId || !admin.hospital) {
        return res.status(403).json({
          success: false,
          error: 'Administrator account is not linked to an authorized hospital.',
        });
      }

      const hospitalId = admin.hospitalId;

      // ── Guard against hospitalId spoofing in query ──
      if (req.query.hospitalId) {
        const queryHospitalId = parseInt(req.query.hospitalId as string, 10);
        if (!isNaN(queryHospitalId) && queryHospitalId !== hospitalId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied. You are not authorized to view analytics for another hospital.',
          });
        }
      }

      // ── Query Parameter Validation ──
      const {
        startDate,
        endDate,
        departmentId,
        appointmentStatus,
      } = req.query as {
        startDate?: string;
        endDate?: string;
        departmentId?: string;
        appointmentStatus?: string;
      };

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate && startDate.trim() !== '') {
        start = new Date(startDate.trim());
        if (isNaN(start.getTime())) {
          return res.status(422).json({
            success: false,
            error: 'Invalid startDate format. Expected YYYY-MM-DD or ISO 8601.',
          });
        }
      }

      if (endDate && endDate.trim() !== '') {
        end = new Date(endDate.trim());
        if (isNaN(end.getTime())) {
          return res.status(422).json({
            success: false,
            error: 'Invalid endDate format. Expected YYYY-MM-DD or ISO 8601.',
          });
        }
      }

      if (start && end) {
        if (start > end) {
          return res.status(422).json({
            success: false,
            error: 'startDate must be earlier than or equal to endDate.',
          });
        }
        // Limit max date range to 5 years (approx 1826 days)
        const fiveYearsMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
        if (end.getTime() - start.getTime() > fiveYearsMs) {
          return res.status(422).json({
            success: false,
            error: 'Date range cannot exceed 5 years.',
          });
        }
      }

      let filteredDeptId: number | undefined;
      if (departmentId && departmentId !== 'all' && departmentId.trim() !== '') {
        const parsedDeptId = parseInt(departmentId, 10);
        if (isNaN(parsedDeptId) || parsedDeptId <= 0) {
          return res.status(422).json({
            success: false,
            error: 'Invalid department ID format.',
          });
        }

        // Verify that this department exists AND belongs to the admin's hospital
        const targetDept = await prisma.department.findFirst({
          where: { id: parsedDeptId, hospitalId },
        });

        if (!targetDept) {
          return res.status(404).json({
            success: false,
            error: 'Department not found in your hospital.',
          });
        }

        filteredDeptId = parsedDeptId;
      }

      let filteredStatusName: string | undefined;
      if (appointmentStatus && appointmentStatus !== 'all' && appointmentStatus.trim() !== '') {
        const normStatus = appointmentStatus.trim().toLowerCase();
        const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];
        if (!validStatuses.includes(normStatus)) {
          return res.status(422).json({
            success: false,
            error: `Invalid appointment status. Allowed values: ${validStatuses.join(', ')}.`,
          });
        }
        filteredStatusName = normStatus;
      }

      // ── Database Aggregation ──

      // 1. Fetch departments in hospital scope
      const hospitalDepartments = await prisma.department.findMany({
        where: {
          hospitalId,
          ...(filteredDeptId ? { id: filteredDeptId } : {}),
        },
        include: {
          _count: {
            select: { doctors: true, nurses: true },
          },
          doctors: {
            select: { id: true },
          },
          nurses: {
            select: { id: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      // 2. Fetch doctors and nurses totals for the hospital
      const [totalHospitalDoctors, totalHospitalNurses] = await Promise.all([
        prisma.doctor.count({
          where: {
            department: {
              hospitalId,
              ...(filteredDeptId ? { id: filteredDeptId } : {}),
            },
          },
        }),
        prisma.nurse.count({
          where: {
            department: {
              hospitalId,
              ...(filteredDeptId ? { id: filteredDeptId } : {}),
            },
          },
        }),
      ]);

      // 3. Build Appointment filtering
      const apptWhere: any = {
        doctor: {
          department: {
            hospitalId,
            ...(filteredDeptId ? { id: filteredDeptId } : {}),
          },
        },
      };

      if (start || end) {
        apptWhere.appointmentDate = {};
        if (start) apptWhere.appointmentDate.gte = start;
        if (end) apptWhere.appointmentDate.lte = end;
      }

      if (filteredStatusName) {
        apptWhere.status = {
          name: { equals: filteredStatusName, mode: 'insensitive' },
        };
      }

      // Execute appointments query (aggregating without exposing any patient PHI)
      const appointments = await prisma.appointment.findMany({
        where: apptWhere,
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          appointmentDate: true,
          status: {
            select: { id: true, name: true },
          },
          doctor: {
            select: {
              id: true,
              departmentId: true,
            },
          },
        },
        orderBy: { appointmentDate: 'asc' },
      });

      // ── Process Department-Level Metrics ──

      // Map appointments by department ID
      const apptsByDept = new Map<number, typeof appointments>();
      for (const dept of hospitalDepartments) {
        apptsByDept.set(dept.id, []);
      }

      for (const appt of appointments) {
        const dId = appt.doctor?.departmentId;
        if (dId && apptsByDept.has(dId)) {
          apptsByDept.get(dId)!.push(appt);
        }
      }

      const departmentMetrics = hospitalDepartments.map((dept) => {
        const deptAppts = apptsByDept.get(dept.id) || [];
        const doctorCount = dept._count.doctors;
        const nurseCount = dept._count.nurses;
        const totalStaff = doctorCount + nurseCount;

        let completed = 0;
        let scheduled = 0;
        let cancelled = 0;
        let noShow = 0;
        const distinctPatients = new Set<number>();

        for (const a of deptAppts) {
          distinctPatients.add(a.patientId);
          const sName = a.status?.name?.toLowerCase() || '';
          if (sName.includes('complete')) {
            completed++;
          } else if (sName.includes('cancel')) {
            cancelled++;
          } else if (sName.includes('no_show') || sName.includes('no-show') || sName.includes('noshow')) {
            noShow++;
          } else {
            scheduled++;
          }
        }

        const apptCount = deptAppts.length;
        const patientCount = distinctPatients.size;

        const completionRate = apptCount > 0 ? Number(((completed / apptCount) * 100).toFixed(1)) : 0;
        const cancellationRate = apptCount > 0 ? Number(((cancelled / apptCount) * 100).toFixed(1)) : 0;
        const noShowRate = apptCount > 0 ? Number(((noShow / apptCount) * 100).toFixed(1)) : 0;

        const avgAppointmentsPerDoctor = doctorCount > 0 ? Number((apptCount / doctorCount).toFixed(1)) : null;
        const avgAppointmentsPerNurse = nurseCount > 0 ? Number((apptCount / nurseCount).toFixed(1)) : null;
        const patientToStaffRatio = totalStaff > 0 ? Number((patientCount / totalStaff).toFixed(1)) : null;

        return {
          id: dept.id,
          name: dept.name,
          description: dept.description || 'Clinical Department',
          doctorCount,
          nurseCount,
          totalStaff,
          patientCount,
          appointmentCount: apptCount,
          completed,
          scheduled,
          cancelled,
          noShow,
          completionRate,
          cancellationRate,
          noShowRate,
          avgAppointmentsPerDoctor,
          avgAppointmentsPerNurse,
          patientToStaffRatio,
        };
      });

      // ── Process Overall Summary Metrics ──
      const allDistinctPatients = new Set<number>();
      let overallCompleted = 0;
      let overallScheduled = 0;
      let overallCancelled = 0;
      let overallNoShow = 0;

      for (const a of appointments) {
        allDistinctPatients.add(a.patientId);
        const sName = a.status?.name?.toLowerCase() || '';
        if (sName.includes('complete')) {
          overallCompleted++;
        } else if (sName.includes('cancel')) {
          overallCancelled++;
        } else if (sName.includes('no_show') || sName.includes('no-show') || sName.includes('noshow')) {
          overallNoShow++;
        } else {
          overallScheduled++;
        }
      }

      const totalAppointments = appointments.length;
      const totalPatients = allDistinctPatients.size;
      const totalStaff = totalHospitalDoctors + totalHospitalNurses;

      // An active department is one with doctors, nurses, or appointment volume
      const activeDepartmentsCount = hospitalDepartments.filter(
        (d) => d._count.doctors > 0 || d._count.nurses > 0 || (apptsByDept.get(d.id)?.length || 0) > 0
      ).length;

      const overallCompletionRate =
        totalAppointments > 0 ? Number(((overallCompleted / totalAppointments) * 100).toFixed(1)) : 0;
      const overallCancellationRate =
        totalAppointments > 0 ? Number(((overallCancelled / totalAppointments) * 100).toFixed(1)) : 0;
      const overallNoShowRate =
        totalAppointments > 0 ? Number(((overallNoShow / totalAppointments) * 100).toFixed(1)) : 0;

      const avgAppointmentsPerDoctor =
        totalHospitalDoctors > 0 ? Number((totalAppointments / totalHospitalDoctors).toFixed(1)) : null;
      const avgAppointmentsPerNurse =
        totalHospitalNurses > 0 ? Number((totalAppointments / totalHospitalNurses).toFixed(1)) : null;
      const patientToStaffRatio =
        totalStaff > 0 ? Number((totalPatients / totalStaff).toFixed(1)) : null;

      // ── Status Distribution ──
      const statusDistribution = [
        {
          status: 'completed',
          label: 'Completed',
          count: overallCompleted,
          percentage: totalAppointments > 0 ? Number(((overallCompleted / totalAppointments) * 100).toFixed(1)) : 0,
        },
        {
          status: 'scheduled',
          label: 'Scheduled',
          count: overallScheduled,
          percentage: totalAppointments > 0 ? Number(((overallScheduled / totalAppointments) * 100).toFixed(1)) : 0,
        },
        {
          status: 'cancelled',
          label: 'Cancelled',
          count: overallCancelled,
          percentage: totalAppointments > 0 ? Number(((overallCancelled / totalAppointments) * 100).toFixed(1)) : 0,
        },
        {
          status: 'no_show',
          label: 'No-Show',
          count: overallNoShow,
          percentage: totalAppointments > 0 ? Number(((overallNoShow / totalAppointments) * 100).toFixed(1)) : 0,
        },
      ];

      // ── Chronological Activity Trends ──
      const trendsMap = new Map<
        string,
        { date: string; completed: number; scheduled: number; cancelled: number; noShow: number; total: number }
      >();

      for (const a of appointments) {
        const dateStr = a.appointmentDate instanceof Date
          ? a.appointmentDate.toISOString().split('T')[0]
          : String(a.appointmentDate).split('T')[0];

        if (!trendsMap.has(dateStr)) {
          trendsMap.set(dateStr, {
            date: dateStr,
            completed: 0,
            scheduled: 0,
            cancelled: 0,
            noShow: 0,
            total: 0,
          });
        }

        const bucket = trendsMap.get(dateStr)!;
        bucket.total++;

        const sName = a.status?.name?.toLowerCase() || '';
        if (sName.includes('complete')) {
          bucket.completed++;
        } else if (sName.includes('cancel')) {
          bucket.cancelled++;
        } else if (sName.includes('no_show') || sName.includes('no-show') || sName.includes('noshow')) {
          bucket.noShow++;
        } else {
          bucket.scheduled++;
        }
      }

      const trends = Array.from(trendsMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // ── Audit Logging ──
      const isFiltered = !!(startDate || endDate || departmentId || appointmentStatus);
      await logAnalyticsAudit(
        userId,
        isFiltered ? 'DEPARTMENT_ANALYTICS_FILTERED' : 'DEPARTMENT_ANALYTICS_VIEWED',
        hospitalId,
        {
          filters: {
            startDate: startDate || null,
            endDate: endDate || null,
            departmentId: filteredDeptId || 'all',
            appointmentStatus: filteredStatusName || 'all',
          },
          totalDepartments: hospitalDepartments.length,
          totalAppointments,
        },
        filteredDeptId
      );

      return res.json({
        success: true,
        data: {
          hospital: {
            id: admin.hospital.id,
            name: admin.hospital.name,
            city: admin.hospital.city,
            state: admin.hospital.state,
          },
          summary: {
            totalDepartments: hospitalDepartments.length,
            activeDepartments: activeDepartmentsCount,
            totalDoctors: totalHospitalDoctors,
            totalNurses: totalHospitalNurses,
            totalAppointments,
            totalPatients,
            completionRate: overallCompletionRate,
            cancellationRate: overallCancellationRate,
            noShowRate: overallNoShowRate,
            avgAppointmentsPerDoctor,
            avgAppointmentsPerNurse,
            patientToStaffRatio,
          },
          departments: departmentMetrics,
          statusDistribution,
          trends,
          appliedFilters: {
            startDate: startDate || null,
            endDate: endDate || null,
            departmentId: filteredDeptId || null,
            appointmentStatus: filteredStatusName || null,
          },
        },
      });
    } catch (err: any) {
      console.error('[ADMIN_ANALYTICS] Department analytics failure:', err);
      return res.status(500).json({
        success: false,
        error: 'Analytics unavailable. Database query failed.',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Department Analytics Export Endpoint (CSV)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/analytics/departments/export
 * Exports department performance details in CSV format respecting selected filters.
 */
router.get(
  '/export',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const admin = await prisma.admin.findFirst({
        where: {
          OR: [
            { userId: userId },
            ...(req.user?.adminId ? [{ id: req.user.adminId }] : []),
          ],
        },
        include: { hospital: true },
      });

      if (!admin || !admin.hospitalId) {
        return res.status(403).json({
          success: false,
          error: 'Administrator account is not linked to an authorized hospital.',
        });
      }

      const hospitalId = admin.hospitalId;

      const {
        startDate,
        endDate,
        departmentId,
        appointmentStatus,
      } = req.query as {
        startDate?: string;
        endDate?: string;
        departmentId?: string;
        appointmentStatus?: string;
      };

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate && startDate.trim() !== '') {
        start = new Date(startDate.trim());
        if (isNaN(start.getTime())) {
          return res.status(422).json({ success: false, error: 'Invalid startDate format.' });
        }
      }

      if (endDate && endDate.trim() !== '') {
        end = new Date(endDate.trim());
        if (isNaN(end.getTime())) {
          return res.status(422).json({ success: false, error: 'Invalid endDate format.' });
        }
      }

      if (start && end && start > end) {
        return res.status(422).json({ success: false, error: 'startDate must be earlier than or equal to endDate.' });
      }

      let filteredDeptId: number | undefined;
      if (departmentId && departmentId !== 'all' && departmentId.trim() !== '') {
        filteredDeptId = parseInt(departmentId, 10);
        if (isNaN(filteredDeptId) || filteredDeptId <= 0) {
          return res.status(422).json({ success: false, error: 'Invalid department ID.' });
        }
        const dept = await prisma.department.findFirst({ where: { id: filteredDeptId, hospitalId } });
        if (!dept) {
          return res.status(404).json({ success: false, error: 'Department not found in your hospital.' });
        }
      }

      let filteredStatusName: string | undefined;
      if (appointmentStatus && appointmentStatus !== 'all' && appointmentStatus.trim() !== '') {
        filteredStatusName = appointmentStatus.trim().toLowerCase();
      }

      // Query departments
      const departments = await prisma.department.findMany({
        where: {
          hospitalId,
          ...(filteredDeptId ? { id: filteredDeptId } : {}),
        },
        include: {
          _count: { select: { doctors: true, nurses: true } },
        },
        orderBy: { name: 'asc' },
      });

      // Query appointments
      const apptWhere: any = {
        doctor: {
          department: {
            hospitalId,
            ...(filteredDeptId ? { id: filteredDeptId } : {}),
          },
        },
      };

      if (start || end) {
        apptWhere.appointmentDate = {};
        if (start) apptWhere.appointmentDate.gte = start;
        if (end) apptWhere.appointmentDate.lte = end;
      }

      if (filteredStatusName) {
        apptWhere.status = {
          name: { equals: filteredStatusName, mode: 'insensitive' },
        };
      }

      const appointments = await prisma.appointment.findMany({
        where: apptWhere,
        select: {
          id: true,
          patientId: true,
          status: { select: { name: true } },
          doctor: { select: { departmentId: true } },
        },
      });

      // Build rows
      const rows: string[] = [
        'Department,Doctors,Nurses,Total Staff,Patients,Appointments,Completed,Scheduled,Cancelled,No-Show,Completion Rate (%),Cancellation Rate (%),No-Show Rate (%)',
      ];

      for (const d of departments) {
        const deptAppts = appointments.filter((a) => a.doctor?.departmentId === d.id);
        const doctorCount = d._count.doctors;
        const nurseCount = d._count.nurses;
        const totalStaff = doctorCount + nurseCount;

        const distinctPatients = new Set<number>();
        let completed = 0;
        let scheduled = 0;
        let cancelled = 0;
        let noShow = 0;

        for (const a of deptAppts) {
          distinctPatients.add(a.patientId);
          const sName = a.status?.name?.toLowerCase() || '';
          if (sName.includes('complete')) completed++;
          else if (sName.includes('cancel')) cancelled++;
          else if (sName.includes('no_show') || sName.includes('no-show') || sName.includes('noshow')) noShow++;
          else scheduled++;
        }

        const apptCount = deptAppts.length;
        const patientCount = distinctPatients.size;
        const compRate = apptCount > 0 ? ((completed / apptCount) * 100).toFixed(1) : '0.0';
        const cancRate = apptCount > 0 ? ((cancelled / apptCount) * 100).toFixed(1) : '0.0';
        const nsRate = apptCount > 0 ? ((noShow / apptCount) * 100).toFixed(1) : '0.0';

        // Escape department name if contains comma
        const escapedName = d.name.includes(',') ? `"${d.name}"` : d.name;

        rows.push(
          `${escapedName},${doctorCount},${nurseCount},${totalStaff},${patientCount},${apptCount},${completed},${scheduled},${cancelled},${noShow},${compRate},${cancRate},${nsRate}`
        );
      }

      const csvContent = rows.join('\r\n');
      const filename = `department-analytics-${new Date().toISOString().split('T')[0]}.csv`;

      await logAnalyticsAudit(
        userId,
        'DEPARTMENT_ANALYTICS_EXPORTED',
        hospitalId,
        {
          filters: {
            startDate: startDate || null,
            endDate: endDate || null,
            departmentId: filteredDeptId || 'all',
            appointmentStatus: filteredStatusName || 'all',
          },
          format: 'CSV',
          rowCount: departments.length,
        },
        filteredDeptId
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (err: any) {
      console.error('[ADMIN_ANALYTICS] Export error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate department analytics export.',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Department Analytics Client Audit Logger Endpoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/analytics/departments/audit
 * Logs client-side analytics interactions (e.g. DEPARTMENT_REPORT_GENERATED).
 */
router.post(
  '/audit',
  authenticateJWT,
  requireRoles(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId && userId !== 0) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }

      const admin = await prisma.admin.findFirst({
        where: {
          OR: [
            { userId: userId },
            ...(req.user?.adminId ? [{ id: req.user.adminId }] : []),
          ],
        },
      });

      if (!admin || !admin.hospitalId) {
        return res.status(403).json({ success: false, error: 'Unauthorized hospital scope.' });
      }

      const { eventName, details } = req.body;
      const allowedEvents = [
        'DEPARTMENT_ANALYTICS_VIEWED',
        'DEPARTMENT_ANALYTICS_FILTERED',
        'DEPARTMENT_REPORT_GENERATED',
        'DEPARTMENT_ANALYTICS_EXPORTED',
      ];

      const safeEvent = allowedEvents.includes(eventName) ? eventName : 'DEPARTMENT_ANALYTICS_VIEWED';

      await logAnalyticsAudit(userId, safeEvent, admin.hospitalId, details || {});

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[ADMIN_ANALYTICS] Audit error:', err);
      return res.status(500).json({ success: false, error: 'Audit log failed.' });
    }
  }
);

export default router;
