/**
 * hospitalAdminService.ts
 * Phase 1 Service Layer for Hospital Administrator Module
 *
 * All functions return Promises to mirror backend integration.
 * In-memory state enables creating, editing, deleting, and publishing notifications.
 * No real API calls or database operations are executed.
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
} from '../types';

// ── In-Memory State for Phase 1 ──────────────────────────────────────────────
let _notifications: HospitalNotification[] = [...MOCK_HOSPITAL_NOTIFICATIONS];
let _statistics: HospitalStatistics = { ...MOCK_HOSPITAL_STATISTICS };
let _reports: HospitalReport[] = [...MOCK_HOSPITAL_REPORTS];
let _activities: HospitalActivity[] = [...MOCK_HOSPITAL_ACTIVITIES];

const DELAY = 250;
const delay = (ms = DELAY) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  await delay(200);
  _notifications = _notifications.filter((n) => n.id !== id);
}

export async function publishNotification(id: string): Promise<HospitalNotification> {
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
  await delay(150);
  const found = _reports.find((r) => r.id === id);
  return found ? { ...found } : null;
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
  await delay(150);
  return [..._activities].slice(0, limit);
}
