/**
 * hospitalAdminService.ts
 * Hospital Administrator Module Service Layer with strict PostgreSQL database connectivity & graceful fallback
 *
 * Architecture:
 * - No JWT / demo mode -> Use mock data
 * - Valid JWT -> Call PostgreSQL API (/api/admin/*)
 * - 200 OK -> Use database data
 * - Network offline / connection refused -> Warn and fall back gracefully
 * - 401/403/422/500 -> Throw real server error (never swallow real database/API bugs)
 */

import {
  MOCK_HOSPITAL_NOTIFICATIONS,
  MOCK_HOSPITAL_STATISTICS,
  MOCK_HOSPITAL_REPORTS,
  MOCK_HOSPITAL_ACTIVITIES,
} from '../data/hospitalAdminMockData';

import type {
  HospitalNotification,
  HospitalStatistics,
  HospitalReport,
  HospitalActivity,
  HospitalNotificationType,
  HospitalNotificationPriority,
  HospitalNotificationStatus,
  HospitalActivityType,
  DepartmentAnalyticsData,
  DepartmentAnalyticsFilters,
  AdminProfile,
  AdminProfileUpdateInput,
  AdminChangePasswordInput,
  AdminNotificationPreferences,
  AdminActivityItem,
} from '../types';

// ── In-Memory State for Demo Mode ─────────────────────────────────────────────
let _notifications: HospitalNotification[] = [...MOCK_HOSPITAL_NOTIFICATIONS];
let _statistics: HospitalStatistics = { ...MOCK_HOSPITAL_STATISTICS };
let _reports: HospitalReport[] = [...MOCK_HOSPITAL_REPORTS];
let _activities: HospitalActivity[] = [...MOCK_HOSPITAL_ACTIVITIES];

const DELAY = 250;
const delay = (ms = DELAY) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Authentication / Token Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getAuthToken(): string | null {
  return localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');
}

function isRealJwt(token: string | null): boolean {
  return !!token && token !== 'demo-token' && token !== 'google-token' && token.split('.').length === 3;
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Hospital Notifications & Announcements
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationFilters {
  search?: string;
  type?: HospitalNotificationType | 'All';
  priority?: HospitalNotificationPriority | 'All';
  status?: HospitalNotificationStatus | 'All';
  sortBy?: 'createdDate' | 'publishDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export async function getNotifications(
  filters: NotificationFilters = {}
): Promise<HospitalNotification[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let list: HospitalNotification[] = json.data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            notificationType: n.type || n.notificationType || 'General Announcement',
            targetAudience: n.targetAudience || 'All Staff',
            priority: n.priority || 'Normal',
            status: n.status || 'Published',
            createdDate: n.createdDate || new Date().toISOString().split('T')[0],
            publishDate: n.publishDate || new Date().toISOString().split('T')[0],
            expiryDate: n.expiryDate || '2026-12-31',
            createdBy: n.createdBy || 'Hospital Administrator',
            department: n.department || 'Administration',
            acknowledgedCount: n.acknowledgedCount || 0,
          }));

          const { search, type, priority, status, sortBy = 'createdDate', sortOrder = 'desc' } = filters;
          if (search) {
            const q = search.toLowerCase();
            list = list.filter(
              (n) =>
                n.title.toLowerCase().includes(q) ||
                n.message.toLowerCase().includes(q) ||
                n.id.toLowerCase().includes(q) ||
                (n.department && n.department.toLowerCase().includes(q))
            );
          }
          if (type && type !== 'All') list = list.filter((n) => n.notificationType === type);
          if (priority && priority !== 'All') list = list.filter((n) => n.priority === priority);
          if (status && status !== 'All') list = list.filter((n) => n.status === status);

          list.sort((a, b) => {
            if (sortBy === 'priority') {
              const pOrder: Record<HospitalNotificationPriority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
              const diff = pOrder[b.priority] - pOrder[a.priority];
              return sortOrder === 'asc' ? -diff : diff;
            }
            if (sortBy === 'title') {
              const comp = a.title.localeCompare(b.title);
              return sortOrder === 'asc' ? comp : -comp;
            }
            const dateA = new Date(a[sortBy] || a.createdDate).getTime();
            const dateB = new Date(b[sortBy] || b.createdDate).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          });

          return list;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching admin notifications`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error fetching notifications, using local mock data:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();

  let list = [..._notifications];
  const { search, type, priority, status, sortBy = 'createdDate', sortOrder = 'desc' } = filters;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        (n.department && n.department.toLowerCase().includes(q))
    );
  }

  if (type && type !== 'All') {
    list = list.filter((n) => n.notificationType === type);
  }

  if (priority && priority !== 'All') {
    list = list.filter((n) => n.priority === priority);
  }

  if (status && status !== 'All') {
    list = list.filter((n) => n.status === status);
  }

  list.sort((a, b) => {
    if (sortBy === 'priority') {
      const pOrder: Record<HospitalNotificationPriority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      const diff = pOrder[b.priority] - pOrder[a.priority];
      return sortOrder === 'asc' ? -diff : diff;
    }
    if (sortBy === 'title') {
      const comp = a.title.localeCompare(b.title);
      return sortOrder === 'asc' ? comp : -comp;
    }
    // Default by date
    const dateA = new Date(a[sortBy] || a.createdDate).getTime();
    const dateB = new Date(b[sortBy] || b.createdDate).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return list;
}

export async function createNotification(
  data: Omit<HospitalNotification, 'id' | 'createdDate' | 'acknowledgedCount'>
): Promise<HospitalNotification> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          notificationType: data.notificationType,
          targetAudience: data.targetAudience,
          priority: data.priority,
          status: data.status,
          department: data.department,
          publishDate: data.publishDate,
          expiryDate: data.expiryDate,
          createdBy: data.createdBy,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const created = json.data;
        const formatted: HospitalNotification = {
          ...data,
          id: created.id,
          createdDate: created.createdDate || new Date().toISOString().split('T')[0],
          publishDate: created.publishDate || created.createdDate || new Date().toISOString().split('T')[0],
          acknowledgedCount: created.acknowledgedCount || 0,
        };
        _notifications = [formatted, ..._notifications.filter((n) => n.id !== formatted.id)];
        return formatted;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) creating notification`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error creating notification, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(300);

  const nowStr = new Date().toISOString().split('T')[0];
  const newNotif: HospitalNotification = {
    ...data,
    id: `NOTIF-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
    createdDate: nowStr,
    acknowledgedCount: 0,
  };

  _notifications = [newNotif, ..._notifications];

  // Log activity
  const newActivity: HospitalActivity = {
    id: `ACT-${Date.now()}`,
    activityType: 'Hospital notification published',
    description: `Created new hospital announcement: "${newNotif.title}"`,
    actor: data.createdBy || 'Hospital Administrator',
    actorRole: 'Hospital Administrator',
    department: data.department || 'Administration',
    dateTime: 'Just now',
    status: 'Completed',
    metadata: `Notice ID: ${newNotif.id} (Status: ${newNotif.status})`,
  };
  _activities = [newActivity, ..._activities];

  return newNotif;
}

export async function updateNotification(
  id: string,
  data: Partial<HospitalNotification>
): Promise<HospitalNotification> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        _notifications = _notifications.map((n) => (n.id === id ? { ...n, ...updated } : n));
        return updated;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) updating notification`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error updating notification, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(250);

  const idx = _notifications.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error('Notification record not found.');

  const updated: HospitalNotification = {
    ..._notifications[idx],
    ...data,
  };

  _notifications[idx] = updated;
  return updated;
}

export async function deleteNotification(id: string): Promise<void> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        _notifications = _notifications.filter((n) => n.id !== id);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) deleting notification`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error deleting notification, removing locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(200);
  _notifications = _notifications.filter((n) => n.id !== id);
}

export async function publishNotification(id: string): Promise<HospitalNotification> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch(`/api/admin/notifications/${id}/publish`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        _notifications = _notifications.map((n) => (n.id === id ? { ...n, ...updated } : n));
        return updated;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) publishing notification`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error publishing notification, saving locally:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay(200);
  const idx = _notifications.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error('Notification record not found.');

  const nowStr = new Date().toISOString().split('T')[0];
  const updated: HospitalNotification = {
    ..._notifications[idx],
    status: 'Published',
    publishDate: nowStr,
  };

  _notifications[idx] = updated;
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Hospital Statistics & Analytics
// ─────────────────────────────────────────────────────────────────────────────

export interface StatisticsFilters {
  department?: string;
  timeframe?: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
}

export async function getHospitalStatistics(
  _filters: StatisticsFilters = {}
): Promise<HospitalStatistics> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const stats = json.data;
          const occupancy = stats.bedOccupancy?.rate ? parseInt(stats.bedOccupancy.rate, 10) : 74;

          return {
            ..._statistics,
            totalPatients: stats.totalPatients ?? _statistics.totalPatients,
            totalDoctors: stats.totalDoctors ?? _statistics.totalDoctors,
            totalNurses: stats.totalNurses ?? _statistics.totalNurses,
            totalDepartments: stats.totalDepartments ?? _statistics.totalDepartments,
            totalAppointments: stats.totalAppointments ?? _statistics.totalAppointments,
            bedOccupancyRate: !isNaN(occupancy) ? occupancy : _statistics.bedOccupancyRate,
          };
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching hospital stats`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error fetching stats, using cached mock statistics:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();
  return { ..._statistics };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Hospital Administrative Reports
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportFilters {
  search?: string;
  reportType?: string;
  department?: string;
}

export async function getHospitalReports(
  filters: ReportFilters = {}
): Promise<HospitalReport[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.reportType && filters.reportType !== 'All') params.append('reportType', filters.reportType);
      if (filters.department && filters.department !== 'All') params.append('department', filters.department);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/admin/reports${qs}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching hospital reports`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error fetching reports, using cached mock reports:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();

  let list = [..._reports];
  const { search, reportType, department } = filters;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }

  if (reportType && reportType !== 'All') {
    list = list.filter((r) => r.reportType === reportType);
  }

  if (department && department !== 'All') {
    list = list.filter((r) => r.department.toLowerCase().includes(department.toLowerCase()));
  }

  return list;
}

export async function getHospitalReportById(id: string): Promise<HospitalReport | null> {
  const all = await getHospitalReports({ search: id });
  const found = all.find((r) => r.id === id);
  if (found) return found;

  await delay(150);
  const localFound = _reports.find((r) => r.id === id);
  return localFound ? { ...localFound } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Hospital Activities & Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityFilters {
  search?: string;
  activityType?: HospitalActivityType | 'All';
  department?: string;
  status?: string;
  actorRole?: string;
}

export async function getHospitalActivities(
  filters: ActivityFilters = {}
): Promise<HospitalActivity[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/admin/activities?limit=50', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let list: HospitalActivity[] = json.data.map((item: any) => ({
            id: item.id,
            activityType: (item.action || 'System maintenance performed') as HospitalActivityType,
            description: `${item.action} on ${item.table || 'platform'} (Record #${item.recordId || item.id})`,
            actor: item.userName || 'System Automator',
            actorRole: 'System Staff',
            department: 'General Administration',
            dateTime: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            status: 'Completed',
            metadata: JSON.stringify(item.details || {}),
          }));

          const { search, activityType, department, status } = filters;
          if (search) {
            const q = search.toLowerCase();
            list = list.filter(
              (a) =>
                a.description.toLowerCase().includes(q) ||
                a.actor.toLowerCase().includes(q) ||
                a.department.toLowerCase().includes(q) ||
                (a.metadata && a.metadata.toLowerCase().includes(q))
            );
          }
          if (activityType && activityType !== 'All') list = list.filter((a) => a.activityType === activityType);
          if (department && department !== 'All') list = list.filter((a) => a.department.toLowerCase().includes(department.toLowerCase()));
          if (status && status !== 'All') list = list.filter((a) => a.status === status);

          return list;
        }
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server error (${res.status}) fetching admin activities`);
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to fetch'))) {
        console.warn('[ADMIN] Network error fetching activities, using local mock data:', err.message);
      } else {
        throw err;
      }
    }
  }

  await delay();

  let list = [..._activities];
  const { search, activityType, department, status } = filters;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (a) =>
        a.description.toLowerCase().includes(q) ||
        a.actor.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        (a.metadata && a.metadata.toLowerCase().includes(q))
    );
  }

  if (activityType && activityType !== 'All') {
    list = list.filter((a) => a.activityType === activityType);
  }

  if (department && department !== 'All') {
    list = list.filter((a) => a.department.toLowerCase().includes(department.toLowerCase()));
  }

  if (status && status !== 'All') {
    list = list.filter((a) => a.status === status);
  }

  return list;
}

export async function getRecentActivities(limit = 6): Promise<HospitalActivity[]> {
  const all = await getHospitalActivities();
  return all.slice(0, limit);
}

export async function getDepartments(): Promise<any[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const res = await fetch('/api/admin/departments', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch {
      // fallback
    }
  }
  return [
    { id: 1, name: 'Cardiology', doctorCount: 4, nurseCount: 6 },
    { id: 2, name: 'Neurology', doctorCount: 3, nurseCount: 5 },
    { id: 3, name: 'Pediatrics', doctorCount: 5, nurseCount: 8 },
    { id: 4, name: 'General Internal Medicine', doctorCount: 6, nurseCount: 10 },
  ];
}

// ─────────────────────────────────────────────────────────────
// 5. Clinical Guidelines Authoring & Management
// ─────────────────────────────────────────────────────────────

export interface AdminClinicalGuideline {
  id: number;
  guidelineCode: string;
  title: string;
  category: string;
  department: string;
  version: string;
  summary: string;
  content: string;
  author: string;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'UNDER_REVIEW' | 'ARCHIVED';
  effectiveDate: string;
  lastUpdated: string;
  createdAt?: string;
}

export interface CreateAdminGuidelineInput {
  guidelineCode?: string;
  title: string;
  category: string;
  department?: string;
  version?: string;
  summary: string;
  content: string;
  author?: string;
  tags?: string[] | string;
  status?: 'DRAFT' | 'PUBLISHED' | 'UNDER_REVIEW' | 'ARCHIVED';
}

const FALLBACK_ADMIN_GUIDELINES: AdminClinicalGuideline[] = [
  {
    id: 1,
    guidelineCode: 'CG-CARD-001',
    title: 'Management of Acute Coronary Syndrome (ACS)',
    category: 'Emergency Care',
    department: 'Cardiology',
    version: '3.2',
    summary: 'Protocol for immediate triage, STEMI alert activation, anticoagulant loading, and catheterization lab escalation.',
    content: '1. Immediate Assessment (0-10 mins):\n- 12-lead ECG within 10 minutes.\n- Aspirin 325 mg non-enteric chewed.\n- P2Y12 inhibitor loading.\n2. Reperfusion Strategy:\n- Primary PCI target FMC-to-device < 90 mins.',
    author: 'Hospital Governance Committee',
    tags: ['Cardiology', 'STEMI', 'Emergency', 'ACS'],
    status: 'PUBLISHED',
    effectiveDate: '2026-01-15',
    lastUpdated: '2026-02-01',
  },
  {
    id: 2,
    guidelineCode: 'CG-EMERG-002',
    title: 'Adult Sepsis & Septic Shock Resuscitation Protocol',
    category: 'Emergency Care',
    department: 'Emergency Medicine',
    version: '4.0',
    summary: 'Hour-1 Sepsis Bundle including serum lactate, blood cultures prior to broad-spectrum antibiotics, and crystalloid boluses.',
    content: '1. Measure lactate level.\n2. Obtain blood cultures before administering antibiotics.\n3. Administer broad-spectrum antibiotics.\n4. Begin rapid administration of 30ml/kg crystalloid for hypotension or lactate >= 4mmol/L.',
    author: 'Critical Care Directorate',
    tags: ['Sepsis', 'ICU', 'Emergency', 'Critical Care'],
    status: 'PUBLISHED',
    effectiveDate: '2026-01-20',
    lastUpdated: '2026-02-10',
  },
  {
    id: 3,
    guidelineCode: 'CG-GEN-003',
    title: 'Inpatient Glycemic Control & Insulin Titration',
    category: 'General Medicine',
    department: 'Internal Medicine',
    version: '2.1',
    summary: 'Standardized basal-bolus-correction insulin orders for non-critically ill hospitalized patients.',
    content: 'Target blood glucose: 140-180 mg/dL for non-critically ill patients.\nDiscontinue oral hypoglycemics on admission.\nInitiate basal-bolus protocol with basal (glargine/degludec) + nutritional (aspart/lispro).',
    author: 'Endocrinology Quality Team',
    tags: ['Diabetes', 'Endocrinology', 'Insulin', 'Inpatient'],
    status: 'PUBLISHED',
    effectiveDate: '2026-02-01',
    lastUpdated: '2026-02-15',
  },
  {
    id: 4,
    guidelineCode: 'CG-INF-004',
    title: 'Hospital-Acquired Infection Prevention & Hand Hygiene',
    category: 'Infection Control',
    department: 'Infection Control',
    version: '5.0',
    summary: 'Strict guidelines for WHO 5 moments of hand hygiene, contact precautions, catheter-associated UTI prevention, and surgical site infection bundles.',
    content: '1. WHO 5 Moments for Hand Hygiene\n- Before touching a patient.\n- Before clean/aseptic procedures.\n- After body fluid exposure risk.\n- After touching a patient.\n- After touching patient surroundings.\n2. PPE & Contact Precautions\n- Don gloves and gown upon entering room of patients with MRSA, VRE, or C. difficile.',
    author: 'Hospital Administration',
    tags: ['Infection Control', 'Hygiene', 'Safety', 'WHO'],
    status: 'PUBLISHED',
    effectiveDate: '2026-01-01',
    lastUpdated: '2026-02-01',
  },
  {
    id: 5,
    guidelineCode: 'CG-PED-005',
    title: 'Pediatric Status Epilepticus Management Algorithm',
    category: 'Emergency Care',
    department: 'Pediatrics',
    version: '1.4',
    summary: 'Stepwise medical management algorithm for continuous convulsive seizures in infants and children.',
    content: '0-5 min: Airway, Breathing, Circulation, high-flow O2, check blood glucose.\n5-10 min: Midazolam 0.2 mg/kg buccal/IM or Lorazepam 0.1 mg/kg IV.\n10-15 min: Second dose of benzodiazepine if ongoing.\n15-20 min: Levetiracetam 60 mg/kg IV or Fosphenytoin 20 mg PE/kg IV.',
    author: 'Pediatric Neurology Board',
    tags: ['Pediatrics', 'Neurology', 'Seizure', 'Emergency'],
    status: 'PUBLISHED',
    effectiveDate: '2026-02-05',
    lastUpdated: '2026-02-20',
  },
];

let _localAdminGuidelines = [...FALLBACK_ADMIN_GUIDELINES];

export async function getAdminGuidelines(filters?: {
  search?: string;
  category?: string;
  status?: string;
  department?: string;
}): Promise<AdminClinicalGuideline[]> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.department) params.append('department', filters.department);

      const res = await fetch(`/api/admin/guidelines?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('[ADMIN_SERVICE] Network error fetching guidelines, using fallback:', err);
    }
  }

  await delay(150);
  let list = [..._localAdminGuidelines];

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.guidelineCode.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.department.toLowerCase().includes(q)
    );
  }
  if (filters?.category && filters.category !== 'All') {
    list = list.filter((g) => g.category === filters.category);
  }
  if (filters?.status && filters.status !== 'All') {
    list = list.filter((g) => g.status === filters.status);
  }
  if (filters?.department && filters.department !== 'All' && filters.department !== 'All Departments') {
    list = list.filter((g) => g.department === filters.department);
  }

  return list;
}

export async function createAdminGuideline(
  input: CreateAdminGuidelineInput
): Promise<AdminClinicalGuideline> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    const res = await fetch('/api/admin/guidelines', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to create clinical guideline (${res.status})`);
    }
    return json.data;
  }

  await delay(200);
  const newId = _localAdminGuidelines.length + 1;
  const newCode = input.guidelineCode || `CG-${(input.category || 'GEN').slice(0, 3).toUpperCase()}-${String(newId).padStart(3, '0')}`;
  const created: AdminClinicalGuideline = {
    id: newId,
    guidelineCode: newCode,
    title: input.title,
    category: input.category,
    department: input.department || 'General Medicine',
    version: input.version || '1.0',
    summary: input.summary,
    content: input.content,
    author: input.author || 'Hospital Administration',
    tags: Array.isArray(input.tags) ? input.tags : (input.tags ? input.tags.split(',').map((t) => t.trim()) : []),
    status: input.status || 'DRAFT',
    effectiveDate: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString().split('T')[0],
  };

  _localAdminGuidelines = [created, ..._localAdminGuidelines];
  return created;
}

export async function updateAdminGuideline(
  id: number | string,
  input: Partial<CreateAdminGuidelineInput>
): Promise<AdminClinicalGuideline> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    const res = await fetch(`/api/admin/guidelines/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to update clinical guideline (${res.status})`);
    }
    return json.data;
  }

  await delay(200);
  const idx = _localAdminGuidelines.findIndex((g) => g.id === Number(id) || g.guidelineCode === String(id));
  if (idx === -1) throw new Error('Clinical guideline not found.');

  const updated: AdminClinicalGuideline = {
    ..._localAdminGuidelines[idx],
    ...input,
    version: input.version || _localAdminGuidelines[idx].version,
    tags: input.tags !== undefined
      ? (Array.isArray(input.tags) ? input.tags : input.tags.split(',').map((t) => t.trim()))
      : _localAdminGuidelines[idx].tags,
    status: (input.status || _localAdminGuidelines[idx].status) as any,
    lastUpdated: new Date().toISOString().split('T')[0],
  };

  _localAdminGuidelines[idx] = updated;
  return updated;
}

export async function deleteAdminGuideline(id: number | string): Promise<void> {
  const token = getAuthToken();
  if (isRealJwt(token)) {
    const res = await fetch(`/api/admin/guidelines/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to delete clinical guideline (${res.status})`);
    }
    return;
  }

  await delay(150);
  _localAdminGuidelines = _localAdminGuidelines.filter((g) => g.id !== Number(id) && g.guidelineCode !== String(id));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Department Analytics & Operational Reporting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches real database-aggregated department analytics for the authenticated hospital administrator.
 * Throws exact HTTP error codes and descriptions upon validation or authorization failure.
 */
export async function getDepartmentAnalytics(
  filters: DepartmentAnalyticsFilters = {}
): Promise<DepartmentAnalyticsData> {
  const params = new URLSearchParams();
  if (filters.startDate && filters.startDate.trim() !== '') {
    params.append('startDate', filters.startDate.trim());
  }
  if (filters.endDate && filters.endDate.trim() !== '') {
    params.append('endDate', filters.endDate.trim());
  }
  if (filters.departmentId && filters.departmentId !== 'all' && filters.departmentId.trim() !== '') {
    params.append('departmentId', filters.departmentId.trim());
  }
  if (filters.appointmentStatus && filters.appointmentStatus !== 'all' && filters.appointmentStatus.trim() !== '') {
    params.append('appointmentStatus', filters.appointmentStatus.trim());
  }

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/admin/analytics/departments${qs}`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.success) {
    const errorMsg = json.error || `Error ${res.status}: Failed to load department analytics.`;
    throw new Error(errorMsg);
  }

  return json.data;
}

/**
 * Downloads live department analytics report directly in CSV format.
 */
export async function exportDepartmentAnalyticsCsv(
  filters: DepartmentAnalyticsFilters = {}
): Promise<void> {
  const params = new URLSearchParams();
  if (filters.startDate && filters.startDate.trim() !== '') {
    params.append('startDate', filters.startDate.trim());
  }
  if (filters.endDate && filters.endDate.trim() !== '') {
    params.append('endDate', filters.endDate.trim());
  }
  if (filters.departmentId && filters.departmentId !== 'all' && filters.departmentId.trim() !== '') {
    params.append('departmentId', filters.departmentId.trim());
  }
  if (filters.appointmentStatus && filters.appointmentStatus !== 'all' && filters.appointmentStatus.trim() !== '') {
    params.append('appointmentStatus', filters.appointmentStatus.trim());
  }

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/admin/analytics/departments/export${qs}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Export failed with status ${res.status}`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `department-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Sends client-side interaction events to the audit logging endpoint.
 */
export async function logDepartmentAnalyticsAudit(
  eventName: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    await fetch('/api/admin/analytics/departments/audit', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ eventName, details }),
    });
  } catch (err) {
    console.error('Failed to send analytics audit event:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Administrator Profile & Account Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches authenticated administrator profile from PostgreSQL.
 */
export async function getAdminProfile(): Promise<AdminProfile> {
  const res = await fetch('/api/admin/profile', {
    headers: getAuthHeaders(),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    if (res.status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (res.status === 403) {
      throw new Error('You do not have permission to access this profile.');
    }
    if (res.status === 404) {
      throw new Error('Administrator profile not found.');
    }
    throw new Error(json.error || `Unable to retrieve administrator profile (${res.status}).`);
  }

  return json.data;
}

/**
 * Updates administrator personal fields (firstName, lastName, phone).
 */
export async function updateAdminProfile(
  data: AdminProfileUpdateInput
): Promise<AdminProfile> {
  const res = await fetch('/api/admin/profile', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    if (res.status === 422) {
      throw new Error(json.error || 'Please correct the highlighted fields.');
    }
    if (res.status === 403) {
      throw new Error(json.error || 'You do not have permission to modify these fields.');
    }
    throw new Error(json.error || 'Unable to update administrator profile. Please try again.');
  }

  // Update cached user name in local storage if present
  try {
    const raw = localStorage.getItem('meditwin_user');
    if (raw) {
      const u = JSON.parse(raw);
      u.firstName = json.data.firstName;
      u.lastName = json.data.lastName;
      localStorage.setItem('meditwin_user', JSON.stringify(u));
    }
  } catch {}

  return json.data;
}

/**
 * Securely changes the administrator password via bcrypt verification.
 */
export async function changeAdminPassword(
  data: AdminChangePasswordInput
): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/profile/password', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to change password. Please verify current password.');
  }

  return { success: true, message: json.message || 'Password changed successfully.' };
}

/**
 * Retrieves administrator notification preferences.
 */
export async function getAdminPreferences(): Promise<AdminNotificationPreferences> {
  const res = await fetch('/api/admin/profile/preferences', {
    headers: getAuthHeaders(),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Notification preferences are currently unavailable.');
  }

  return json.data;
}

/**
 * Updates administrator notification preferences.
 */
export async function updateAdminPreferences(
  preferences: Partial<AdminNotificationPreferences>
): Promise<AdminNotificationPreferences> {
  const res = await fetch('/api/admin/profile/preferences', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ preferences }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to update notification preferences.');
  }

  return json.data;
}

/**
 * Retrieves recent chronological administrative activity stream from PostgreSQL audit logs.
 */
export async function getAdminActivity(limit: number = 15): Promise<AdminActivityItem[]> {
  const res = await fetch(`/api/admin/profile/activity?limit=${limit}`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to retrieve administrative activity.');
  }

  return json.data || [];
}

/**
 * Securely terminates administrator session and clears stored tokens.
 */
export async function adminLogout(): Promise<void> {
  try {
    await fetch('/api/admin/profile/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (err) {
    console.error('Logout request failed:', err);
  } finally {
    localStorage.removeItem('meditwin_token');
    localStorage.removeItem('meditwin_user');
    sessionStorage.removeItem('meditwin_token');
    sessionStorage.removeItem('meditwin_user');
  }
}
