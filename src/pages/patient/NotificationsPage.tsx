import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  FileText,
  Pill,
  Calendar,
  FlaskConical,
  Clock,
  Check,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as patientService from '../../services/patientService';
import type { PatientNotification, PatientNotificationType } from '../../types';

interface NotificationsPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateTab }) => {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');

  const [selectedNotif, setSelectedNotif] = useState<PatientNotification | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await patientService.getNotifications();
      setNotifications(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await patientService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await patientService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSuccessMsg('All notifications marked as read.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to mark all as read.');
    }
  };

  const getNotifIcon = (type: PatientNotificationType) => {
    switch (type) {
      case 'medicine_reminder':
        return <Pill className="w-4 h-4 text-amber-400" />;
      case 'lab_report':
        return <FlaskConical className="w-4 h-4 text-accent" />;
      case 'prescription':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'document':
        return <CheckCircle2 className="w-4 h-4 text-sky-400" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  const getNotifBadgeClass = (type: PatientNotificationType) => {
    switch (type) {
      case 'medicine_reminder':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'lab_report':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'prescription':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'document':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'appointment':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default:
        return 'bg-gray-500/15 text-gray-300 border-gray-500/30';
    }
  };

  const filteredNotifs = notifications.filter(
    (n) => selectedType === 'All' || n.type === selectedType
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
                  Notification Center
                </span>
                {unreadCount > 0 && (
                  <span className="text-xs text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Health Notifications</h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Alerts regarding medication schedules, lab results, prescriptions, and healthcare events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleMarkAllRead}
              >
                Mark All as Read
              </Button>
            )}
            <Button variant="glass" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadNotifications}>
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Feedback Banners ── */}
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

      {/* ── Category Filters ── */}
      <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center gap-2">
        {[
          { id: 'All', label: 'All Alerts' },
          { id: 'medicine_reminder', label: 'Medicine Reminders' },
          { id: 'lab_report', label: 'Lab Reports' },
          { id: 'prescription', label: 'Prescriptions' },
          { id: 'document', label: 'Document Records' },
          { id: 'appointment', label: 'Appointments' },
        ].map((cat) => {
          const count =
            cat.id === 'All'
              ? notifications.length
              : notifications.filter((n) => n.type === cat.id).length;
          const isSelected = selectedType === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white border border-accent/40 shadow-glow-primary font-bold'
                  : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Notifications List ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading notifications...</p>
        </div>
      ) : filteredNotifs.length === 0 ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
            <Bell className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-white">No new notifications.</p>
          <p className="text-xs text-gray-400 max-w-sm">
            {selectedType !== 'All'
              ? 'No notifications found for the selected category.'
              : 'You have cleared all alerts in your notification center.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card-interactive p-4 border rounded-2xl flex items-start justify-between gap-4 transition-all ${
                notif.isRead
                  ? 'border-white/5 bg-white/[0.02] opacity-80'
                  : 'border-accent/30 bg-accent/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 mt-0.5">
                  {getNotifIcon(notif.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getNotifBadgeClass(notif.type)}`}>
                      {notif.type.replace('_', ' ').toUpperCase()}
                    </span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    )}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {notif.dateTime}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{notif.title}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{notif.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-center">
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    title="Mark as Read"
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    handleMarkRead(notif.id);
                    if (notif.linkTab && onNavigateTab) {
                      onNavigateTab(notif.linkTab);
                    } else {
                      setSelectedNotif(notif);
                    }
                  }}
                >
                  View
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── View Detail Modal ── */}
      <AnimatePresence>
        {selectedNotif && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setSelectedNotif(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-md w-full p-6 border border-white/20 bg-navy-900/98 rounded-2xl space-y-4 text-xs"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-accent/20 text-accent">
                    {getNotifIcon(selectedNotif.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedNotif.title}</h3>
                    <p className="text-gray-400 font-mono text-[11px]">{selectedNotif.dateTime}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 leading-relaxed text-sm">
                {selectedNotif.message}
              </div>

              <div className="flex gap-2 pt-2">
                {selectedNotif.linkTab && onNavigateTab && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 justify-center"
                    onClick={() => {
                      const tab = selectedNotif.linkTab!;
                      setSelectedNotif(null);
                      onNavigateTab(tab);
                    }}
                  >
                    Open {selectedNotif.linkTab.replace('-', ' ')}
                  </Button>
                )}
                <Button variant="glass" size="sm" className="justify-center" onClick={() => setSelectedNotif(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPage;
