import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Send,
  X,
  Calendar,
  Building,
  Users,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as hospitalAdminService from '../../services/hospitalAdminService';
import type {
  HospitalNotification,
  HospitalNotificationType,
  HospitalTargetAudience,
  HospitalNotificationPriority,
  HospitalNotificationStatus,
} from '../../types';

const NOTIFICATION_TYPES: HospitalNotificationType[] = [
  'General Announcement',
  'Hospital Notice',
  'Health Awareness',
  'Emergency Notice',
  'Maintenance Notice',
  'Policy Update',
];

const TARGET_AUDIENCES: HospitalTargetAudience[] = [
  'All Users',
  'Doctors',
  'Nurses',
  'Patients',
  'Healthcare Professionals',
];

const PRIORITIES: HospitalNotificationPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

const STATUSES: HospitalNotificationStatus[] = ['Draft', 'Published', 'Scheduled', 'Expired'];

interface FormState {
  title: string;
  message: string;
  notificationType: HospitalNotificationType | '';
  targetAudience: HospitalTargetAudience | '';
  priority: HospitalNotificationPriority | '';
  publishDate: string;
  expiryDate: string;
  status: HospitalNotificationStatus;
  department: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  message: '',
  notificationType: 'General Announcement',
  targetAudience: 'All Users',
  priority: 'Medium',
  publishDate: new Date().toISOString().split('T')[0],
  expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'Published',
  department: 'Hospital Administration',
};

export const HospitalNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<HospitalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<HospitalNotificationType | 'All'>('All');
  const [selectedPriority, setSelectedPriority] = useState<HospitalNotificationPriority | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<HospitalNotificationStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'createdDate' | 'priority' | 'title'>('createdDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal & Delete Confirmation
  const [viewNotif, setViewNotif] = useState<HospitalNotification | null>(null);
  const [deleteNotifId, setDeleteNotifId] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await hospitalAdminService.getNotifications({
        search: searchQuery,
        type: selectedType,
        priority: selectedPriority,
        status: selectedStatus,
        sortBy,
        sortOrder,
      });
      setNotifications(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [searchQuery, selectedType, selectedPriority, selectedStatus, sortBy, sortOrder]);

  // Auto-clear success toast
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required.';
    if (!form.message.trim()) errors.message = 'Message content is required.';
    if (!form.notificationType) errors.notificationType = 'Please select a notification type.';
    if (!form.targetAudience) errors.targetAudience = 'Target audience is required.';
    if (!form.priority) errors.priority = 'Priority is required.';
    if (!form.publishDate) errors.publishDate = 'Publish date is required.';
    if (!form.expiryDate) {
      errors.expiryDate = 'Expiry date is required.';
    } else if (new Date(form.expiryDate) < new Date(form.publishDate)) {
      errors.expiryDate = 'Expiry date must be on or after publish date.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (notif: HospitalNotification) => {
    setEditingId(notif.id);
    setForm({
      title: notif.title,
      message: notif.message,
      notificationType: notif.notificationType,
      targetAudience: notif.targetAudience,
      priority: notif.priority,
      publishDate: notif.publishDate,
      expiryDate: notif.expiryDate,
      status: notif.status,
      department: notif.department || 'Hospital Administration',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent, forceStatus?: HospitalNotificationStatus) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const finalStatus = forceStatus || form.status;

      if (editingId) {
        await hospitalAdminService.updateNotification(editingId, {
          title: form.title.trim(),
          message: form.message.trim(),
          notificationType: form.notificationType as HospitalNotificationType,
          targetAudience: form.targetAudience as HospitalTargetAudience,
          priority: form.priority as HospitalNotificationPriority,
          publishDate: form.publishDate,
          expiryDate: form.expiryDate,
          department: form.department.trim() || 'Hospital Administration',
          status: finalStatus,
        });
        setSuccessMsg(`Notification "${form.title}" updated successfully.`);
      } else {
        await hospitalAdminService.createNotification({
          title: form.title.trim(),
          message: form.message.trim(),
          notificationType: form.notificationType as HospitalNotificationType,
          targetAudience: form.targetAudience as HospitalTargetAudience,
          priority: form.priority as HospitalNotificationPriority,
          publishDate: form.publishDate,
          expiryDate: form.expiryDate,
          status: finalStatus,
          department: form.department.trim() || 'Hospital Administration',
          createdBy: 'Hospital Administrator',
        });
        setSuccessMsg(
          finalStatus === 'Published'
            ? 'Hospital notification published successfully.'
            : 'Notification saved as draft.'
        );
      }

      setIsFormOpen(false);
      loadNotifications();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save notification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishNow = async (id: string, title: string) => {
    try {
      await hospitalAdminService.publishNotification(id);
      setSuccessMsg(`"${title}" is now published.`);
      loadNotifications();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to publish notification.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteNotifId) return;
    try {
      await hospitalAdminService.deleteNotification(deleteNotifId);
      setSuccessMsg('Notification deleted successfully.');
      setDeleteNotifId(null);
      loadNotifications();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete notification.');
    }
  };

  const getPriorityBadgeClass = (priority: HospitalNotificationPriority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Medium':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'Low':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getStatusBadgeClass = (status: HospitalNotificationStatus) => {
    switch (status) {
      case 'Published':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Scheduled':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'Draft':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Expired':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-accent/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  Hospital Communication Center
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Broadcast Engine Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Hospital Notifications & Announcements
              </h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Create, publish, and target administrative notices, emergency bulletins, and hospital policies
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Create Notification
          </Button>
        </div>
      </motion.div>

      {/* ── Toast / Banners ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filters and Search Toolbar ── */}
      <div className="glass-card p-4 border border-white/10 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, message, ID, department..."
              className="w-full py-2.5 pl-10 pr-4 text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            />
          </div>

          {/* Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full py-2.5 px-3 text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            >
              <option value="All">All Notification Types</option>
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="w-full py-2.5 px-3 text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            >
              <option value="All">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p} Priority
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full py-2.5 px-3 text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort and Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Sort By:</span>
            <button
              onClick={() => {
                setSortBy('createdDate');
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                sortBy === 'createdDate'
                  ? 'bg-accent/20 border-accent/40 text-accent font-bold'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              Date {sortBy === 'createdDate' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                setSortBy('priority');
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                sortBy === 'priority'
                  ? 'bg-accent/20 border-accent/40 text-accent font-bold'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              Priority {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                setSortBy('title');
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              }}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                sortBy === 'title'
                  ? 'bg-accent/20 border-accent/40 text-accent font-bold'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-400">
              Showing <strong className="text-white">{notifications.length}</strong> announcements
            </span>
            <Button
              variant="glass"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={loadNotifications}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Notification List / Cards ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading hospital notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
            <Bell className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-white">No hospital notifications found.</p>
          <p className="text-xs text-gray-400 max-w-sm">
            {searchQuery || selectedType !== 'All' || selectedPriority !== 'All' || selectedStatus !== 'All'
              ? 'Try changing your search keywords or resetting filters.'
              : 'Create your first hospital announcement or policy update.'}
          </p>
          <Button
            variant="accent"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenCreate}
          >
            Create First Notice
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card-interactive p-5 border rounded-2xl flex flex-col justify-between space-y-4 ${
                notif.priority === 'Urgent'
                  ? 'border-rose-500/40 bg-rose-500/[0.03]'
                  : notif.status === 'Published'
                  ? 'border-white/15'
                  : 'border-white/10 opacity-90'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-accent">{notif.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadgeClass(notif.priority)}`}>
                      {notif.priority} Priority
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(notif.status)}`}>
                      {notif.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-gray-300">
                      {notif.notificationType}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white">{notif.title}</h3>
                </div>

                <div className="text-xs text-gray-400 flex items-center gap-1.5 font-mono self-start">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  <span>Published: {notif.publishDate}</span>
                </div>
              </div>

              {/* Message snippet */}
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed line-clamp-3">
                {notif.message}
              </p>

              {/* Footer Metadata & Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>Audience: <strong className="text-white">{notif.targetAudience}</strong></span>
                  </div>
                  {notif.department && (
                    <div className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-accent" />
                      <span>{notif.department}</span>
                    </div>
                  )}
                  {notif.acknowledgedCount !== undefined && notif.acknowledgedCount > 0 && (
                    <div className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{notif.acknowledgedCount} Acknowledged</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {notif.status === 'Draft' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => handlePublishNow(notif.id, notif.title)}
                    >
                      Publish
                    </Button>
                  )}
                  <button
                    onClick={() => setViewNotif(notif)}
                    title="View Full Details"
                    className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/25 text-accent transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(notif)}
                    title="Edit Notification"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteNotifId(notif.id)}
                    title="Delete Notification"
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <AnimatePresence>
        {isFormOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setIsFormOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-2xl w-full p-6 sm:p-8 border border-white/20 bg-navy-900/98 max-h-[90vh] overflow-y-auto rounded-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingId ? 'Edit Hospital Notification' : 'Create Hospital Notification'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Broadcasting administrative bulletins and healthcare updates
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={(e) => handleFormSubmit(e)} noValidate className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                    Notification Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Mandatory CME Lecture on Patient Digital Twin AI"
                    className={`w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 ${
                      formErrors.title ? 'border-rose-500/60' : 'border-white/15 focus:border-accent/60'
                    }`}
                  />
                  {formErrors.title && <p className="text-rose-400 text-[11px]">{formErrors.title}</p>}
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                    Message / Announcement Body <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Provide full announcement details, directives, instructions, or schedules..."
                    className={`w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 ${
                      formErrors.message ? 'border-rose-500/60' : 'border-white/15 focus:border-accent/60'
                    }`}
                  />
                  {formErrors.message && <p className="text-rose-400 text-[11px]">{formErrors.message}</p>}
                </div>

                {/* Notification Type & Target Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                      Notification Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={form.notificationType}
                      onChange={(e) => setForm((p) => ({ ...p, notificationType: e.target.value as any }))}
                      className="w-full py-2.5 px-3 text-sm text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
                    >
                      {NOTIFICATION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                      Target Audience <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={form.targetAudience}
                      onChange={(e) => setForm((p) => ({ ...p, targetAudience: e.target.value as any }))}
                      className="w-full py-2.5 px-3 text-sm text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
                    >
                      {TARGET_AUDIENCES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority & Issuing Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                      Priority Level <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as any }))}
                      className="w-full py-2.5 px-3 text-sm text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p} Priority
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                      Department / Office
                    </label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                      placeholder="e.g. Hospital Administration"
                      className="w-full py-2.5 px-3 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
                    />
                  </div>
                </div>

                {/* Publish Date & Expiry Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                      Publish Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.publishDate}
                      onChange={(e) => setForm((p) => ({ ...p, publishDate: e.target.value }))}
                      className="w-full py-2.5 px-3 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 [color-scheme:dark]"
                    />
                    {formErrors.publishDate && <p className="text-rose-400 text-[11px]">{formErrors.publishDate}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-gray-300 uppercase tracking-wider">
                      Expiry Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.expiryDate}
                      min={form.publishDate}
                      onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                      className="w-full py-2.5 px-3 text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 [color-scheme:dark]"
                    />
                    {formErrors.expiryDate && <p className="text-rose-400 text-[11px]">{formErrors.expiryDate}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submitting}
                    icon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    onClick={(e) => handleFormSubmit(e, 'Published')}
                  >
                    {editingId ? 'Save & Publish' : 'Publish Notification'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={submitting}
                    onClick={(e) => handleFormSubmit(e, 'Draft')}
                  >
                    Save as Draft
                  </Button>

                  <Button
                    type="button"
                    variant="glass"
                    size="md"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── View Detail Modal ── */}
      <AnimatePresence>
        {viewNotif && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setViewNotif(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-xl w-full p-6 sm:p-8 border border-white/20 bg-navy-900/98 rounded-2xl space-y-5"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-accent font-bold">{viewNotif.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadgeClass(viewNotif.priority)}`}>
                      {viewNotif.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(viewNotif.status)}`}>
                      {viewNotif.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{viewNotif.title}</h3>
                </div>
                <button
                  onClick={() => setViewNotif(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Type</span>
                  <span className="text-white font-medium">{viewNotif.notificationType}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Target Audience</span>
                  <span className="text-white font-medium">{viewNotif.targetAudience}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Publish Date</span>
                  <span className="text-white font-medium">{viewNotif.publishDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Expiry Date</span>
                  <span className="text-white font-medium">{viewNotif.expiryDate}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Created By</span>
                  <span className="text-white font-medium">{viewNotif.createdBy}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Department</span>
                  <span className="text-white font-medium">{viewNotif.department || 'N/A'}</span>
                </div>
              </div>

              {/* Message */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs sm:text-sm text-gray-200 leading-relaxed space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Announcement Body:</span>
                <p>{viewNotif.message}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="glass"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => setViewNotif(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Modal ── */}
      <AnimatePresence>
        {deleteNotifId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setDeleteNotifId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-sm w-full p-6 border border-rose-500/30 bg-navy-900/98 rounded-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Announcement?</h3>
              <p className="text-xs text-gray-300">
                Are you sure you want to permanently remove this notification from the hospital communication system?
              </p>
              <div className="flex gap-3">
                <Button variant="glass" size="sm" className="flex-1 justify-center" onClick={() => setDeleteNotifId(null)}>
                  Cancel
                </Button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-lg"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HospitalNotificationsPage;
