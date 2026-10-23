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
  Megaphone,
  CalendarX,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as patientService from '../../services/patientService';
import * as doctorService from '../../services/doctorService';
import type { PatientNotification, PatientNotificationType, PatientBookedAppointment } from '../../types';

interface NotificationsPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateTab }) => {
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [appointments, setAppointments] = useState<PatientBookedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');

  const [selectedNotif, setSelectedNotif] = useState<PatientNotification | null>(null);

  // Cancellation Modal State
  const [cancelTarget, setCancelTarget] = useState<PatientBookedAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<PatientBookedAppointment | null>(null);
  const today = new Date();
  const minDateStr = today.toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 14);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const [rescheduleDate, setRescheduleDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('11:00 AM');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [rescheduleModalError, setRescheduleModalError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const userRaw = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      const role = (userObj?.role || '').toLowerCase();

      let data: PatientNotification[] = [];
      if (role === 'doctor') {
        try {
          const docData = await doctorService.getDoctorNotifications();
          if (Array.isArray(docData) && docData.length > 0) {
            data = docData;
          } else {
            data = await patientService.getNotifications();
          }
        } catch {
          data = await patientService.getNotifications();
        }
      } else {
        data = await patientService.getNotifications();
      }
      setNotifications(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const data = await patientService.getPatientAppointments();
      setAppointments(data);
    } catch (err) {
      console.warn('[NotificationsPage] Failed to fetch appointments for context:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadAppointments();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      const userRaw = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      const role = (userObj?.role || '').toLowerCase();

      if (role === 'doctor') {
        await doctorService.markDoctorNotificationRead(id);
      }
      await patientService.markNotificationRead(id).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const userRaw = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
      const userObj = userRaw ? JSON.parse(userRaw) : null;
      const role = (userObj?.role || '').toLowerCase();

      if (role === 'doctor') {
        await doctorService.markAllDoctorNotificationsRead();
      }
      await patientService.markAllNotificationsRead().catch(() => {});

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSuccessMsg('All notifications marked as read.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to mark all as read.');
    }
  };

  // Helper: check if appointment is in the future & eligible to cancel/reschedule
  const isAppointmentEligible = (appt: PatientBookedAppointment): boolean => {
    if (appt.status !== 'scheduled') return false;
    try {
      const now = new Date();
      let apptDate = new Date(appt.date);
      if (isNaN(apptDate.getTime()) && appt.rawDate) {
        apptDate = new Date(appt.rawDate);
      }
      if (!isNaN(apptDate.getTime()) && appt.time) {
        const timeMatch = appt.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const meridian = timeMatch[3]?.toUpperCase();
          if (meridian === 'PM' && hours < 12) hours += 12;
          if (meridian === 'AM' && hours === 12) hours = 0;
          apptDate.setHours(hours, minutes, 0, 0);
        }
      }
      return apptDate.getTime() > now.getTime();
    } catch {
      return false;
    }
  };

  // Helper: Associate notification with a booked appointment
  const findAssociatedAppointment = (notif: PatientNotification): PatientBookedAppointment | null => {
    if (notif.appointmentId) {
      const found = appointments.find((a) => a.id === notif.appointmentId);
      if (found) return found;
    }

    const isApptNotif =
      notif.type === 'appointment' ||
      notif.title.toLowerCase().includes('appointment') ||
      notif.message.toLowerCase().includes('consultation') ||
      notif.message.toLowerCase().includes('scheduled');

    if (isApptNotif) {
      // 1. Match by doctor name
      const docMatch = appointments.find((a) => {
        const docName = (a.doctor?.name || `${a.doctor?.firstName || ''} ${a.doctor?.lastName || ''}`).toLowerCase();
        const docLast = (a.doctor?.lastName || '').toLowerCase();
        return (
          (docName && (notif.message.toLowerCase().includes(docName) || notif.title.toLowerCase().includes(docName))) ||
          (docLast && (notif.message.toLowerCase().includes(docLast) || notif.title.toLowerCase().includes(docLast)))
        );
      });
      if (docMatch) return docMatch;

      // 2. Fallback to active upcoming appointment
      const eligible = appointments.find(isAppointmentEligible);
      if (eligible) return eligible;

      // 3. Fallback to any appointment in list
      if (appointments.length > 0) return appointments[0];
    }
    return null;
  };

  // Confirm and execute cancellation
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    try {
      setSubmittingCancel(true);
      setCancelModalError(null);

      const res = await patientService.cancelPatientAppointment(
        cancelTarget.id,
        cancelReason.trim() || undefined
      );

      // 1. Update appointment status in local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === cancelTarget.id ? { ...a, status: 'cancelled' } : a))
      );

      // 2. Append cancellation alert to notifications
      const cancellationNotif: PatientNotification = {
        id: `NOTIF-CANCEL-${Date.now()}`,
        patientId: cancelTarget.doctor?.id || 1,
        title: 'Appointment Cancelled',
        message: `Your appointment with ${cancelTarget.doctor.name} on ${cancelTarget.date} at ${cancelTarget.time} has been cancelled.`,
        dateTime: 'Just now',
        type: 'appointment',
        isRead: false,
        linkTab: 'appointments',
        appointmentId: cancelTarget.id,
      };
      setNotifications((prev) => [cancellationNotif, ...prev]);

      // 3. Set success notification & close modal
      setSuccessMsg(
        res.message ||
          `Appointment ${cancelTarget.appointmentId} cancelled successfully. The schedule slot is now released.`
      );
      setCancelTarget(null);
      setCancelReason('');
    } catch (err: any) {
      setCancelModalError(
        err.message || 'Failed to cancel appointment. Please verify your connection or try again.'
      );
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Confirm and execute reschedule
  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleSlot) return;

    try {
      setSubmittingReschedule(true);
      setRescheduleModalError(null);

      const res = await patientService.reschedulePatientAppointment(
        rescheduleTarget.id,
        rescheduleDate,
        rescheduleSlot
      );

      // 1. Update appointment in local state
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === rescheduleTarget.id
            ? { ...a, date: rescheduleDate, time: rescheduleSlot, status: 'scheduled' }
            : a
        )
      );

      // 2. Append rescheduled alert to notifications
      const rescheduledNotif: PatientNotification = {
        id: `NOTIF-RESCHED-${Date.now()}`,
        patientId: rescheduleTarget.doctor?.id || 1,
        title: 'Appointment Rescheduled',
        message: `Your appointment with ${rescheduleTarget.doctor.name} has been rescheduled to ${rescheduleDate} at ${rescheduleSlot}.`,
        dateTime: 'Just now',
        type: 'appointment',
        isRead: false,
        linkTab: 'appointments',
        appointmentId: rescheduleTarget.id,
      };
      setNotifications((prev) => [rescheduledNotif, ...prev]);

      // 3. Show success message & close modal
      setSuccessMsg(
        res.message ||
          `Appointment rescheduled to ${rescheduleDate} at ${rescheduleSlot}.`
      );
      setRescheduleTarget(null);
    } catch (err: any) {
      setRescheduleModalError(
        err.message || 'Failed to reschedule appointment. Please try again.'
      );
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const getNotifIcon = (type: PatientNotificationType | string) => {
    switch (type) {
      case 'clinical_guideline':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'announcement':
      case 'general':
        return <Megaphone className="w-4 h-4 text-amber-400" />;
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

  const getNotifBadgeClass = (type: PatientNotificationType | string) => {
    switch (type) {
      case 'clinical_guideline':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'announcement':
      case 'general':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
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
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Notification Center</h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Hospital announcements, appointment updates, rescheduling, cancellations, and clinical alerts
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleMarkAllRead}
              >
                Mark All as Read
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Feedback Banners ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category Filters ── */}
      <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center gap-2">
        {[
          { id: 'All', label: 'All Alerts' },
          { id: 'clinical_guideline', label: 'Clinical Guidelines' },
          { id: 'appointment', label: 'Appointments' },
          { id: 'announcement', label: 'Hospital Announcements' },
          { id: 'medicine_reminder', label: 'Medicine Reminders' },
          { id: 'lab_report', label: 'Lab Reports' },
          { id: 'prescription', label: 'Prescriptions' },
          { id: 'document', label: 'Document Records' },
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
          <p className="text-base font-bold text-white">No notifications found.</p>
          <p className="text-xs text-gray-400 max-w-sm">
            {selectedType !== 'All'
              ? 'No notifications found for the selected category.'
              : 'You have cleared all alerts in your notification center.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => {
            const associatedAppt = findAssociatedAppointment(notif);
            const isEligible = associatedAppt ? isAppointmentEligible(associatedAppt) : false;
            const isApptCancelled = associatedAppt?.status === 'cancelled';
            const isApptType =
              notif.type === 'appointment' ||
              notif.title.toLowerCase().includes('appointment') ||
              notif.message.toLowerCase().includes('consultation');

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card-interactive p-4 border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
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
                      {isApptCancelled && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                          Cancelled
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white">{notif.title}</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">{notif.message}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      title="Mark as Read"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  {/* ── Reschedule & Cancel Options on Appointment Notifications ── */}
                  {isApptType && isEligible && associatedAppt && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-sky-500/40 text-sky-300 hover:text-white hover:bg-sky-600/30 text-xs font-bold"
                        icon={<Calendar className="w-3.5 h-3.5 text-sky-400" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRescheduleTarget(associatedAppt);
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          setRescheduleDate(d.toISOString().split('T')[0]);
                          setRescheduleSlot(associatedAppt.time || '10:00 AM');
                          setRescheduleModalError(null);
                        }}
                      >
                        <span className="hidden sm:inline">Reschedule</span>
                        <span className="sm:hidden">Resched</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="border-rose-500/40 text-rose-300 hover:text-white hover:bg-rose-600/30 text-xs font-bold"
                        icon={<CalendarX className="w-3.5 h-3.5 text-rose-400" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelTarget(associatedAppt);
                          setCancelReason('');
                          setCancelModalError(null);
                        }}
                      >
                        <span className="hidden sm:inline">Cancel Appointment</span>
                        <span className="sm:hidden">Cancel</span>
                      </Button>
                    </>
                  )}

                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      handleMarkRead(notif.id);
                      if (notif.linkTab && onNavigateTab && notif.type !== 'appointment') {
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
            );
          })}
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
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 leading-relaxed text-sm">
                {selectedNotif.message}
              </div>

              {/* Action buttons inside View Detail modal */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {(() => {
                  const appt = findAssociatedAppointment(selectedNotif);
                  const isEligible = appt ? isAppointmentEligible(appt) : false;
                  if (appt && isEligible) {
                    return (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-sky-500/40 text-sky-300 hover:text-white hover:bg-sky-600/30 text-xs font-bold"
                          icon={<Calendar className="w-3.5 h-3.5 text-sky-400" />}
                          onClick={() => {
                            setSelectedNotif(null);
                            setRescheduleTarget(appt);
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            setRescheduleDate(d.toISOString().split('T')[0]);
                            setRescheduleSlot(appt.time || '10:00 AM');
                            setRescheduleModalError(null);
                          }}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-glow-rose/20 text-xs font-bold"
                          icon={<CalendarX className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setSelectedNotif(null);
                            setCancelTarget(appt);
                            setCancelReason('');
                            setCancelModalError(null);
                          }}
                        >
                          Cancel Appointment
                        </Button>
                      </>
                    );
                  }
                  return null;
                })()}

                {selectedNotif.linkTab && onNavigateTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-center text-xs"
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

      {/* ── Reschedule Appointment Modal ── */}
      <AnimatePresence>
        {rescheduleTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => {
              if (!submittingReschedule) {
                setRescheduleTarget(null);
                setRescheduleModalError(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-lg w-full p-6 border border-sky-500/30 bg-navy-900/98 rounded-3xl space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    Reschedule Appointment
                  </h3>
                  <p className="text-xs text-gray-400">
                    Select a new date and time slot for your consultation.
                  </p>
                </div>
              </div>

              {rescheduleModalError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{rescheduleModalError}</span>
                </div>
              )}

              {/* Current Appointment Info */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                    {rescheduleTarget.appointmentId}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {rescheduleTarget.type === 'video' ? 'Virtual Video Consultation' : 'Hospital OPD Visit'}
                  </span>
                </div>
                <p className="font-extrabold text-white text-sm">{rescheduleTarget.doctor.name}</p>
                <p className="text-[11px] text-accent">{rescheduleTarget.doctor.specialization} · {rescheduleTarget.doctor.department}</p>
                <p className="text-[10px] text-gray-400 pt-1">
                  Current Schedule: <span className="text-gray-200 font-semibold">{rescheduleTarget.date} at {rescheduleTarget.time}</span>
                </p>
              </div>

              {/* Date Selector */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Select New Date
                  </label>
                  <span className="text-[10px] text-sky-300 font-semibold">
                    Next 14 Days
                  </span>
                </div>
                <input
                  type="date"
                  min={minDateStr}
                  max={maxDateStr}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  disabled={submittingReschedule}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all cursor-pointer"
                />
              </div>

              {/* Slot Selector */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Select New Time Slot
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {[
                    '09:00 AM',
                    '09:30 AM',
                    '10:00 AM',
                    '10:30 AM',
                    '11:00 AM',
                    '11:30 AM',
                    '02:00 PM',
                    '02:30 PM',
                    '03:00 PM',
                    '03:30 PM',
                    '04:00 PM',
                    '04:30 PM',
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      disabled={submittingReschedule}
                      onClick={() => setRescheduleSlot(slot)}
                      className={`text-[11px] py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        rescheduleSlot === slot
                          ? 'bg-sky-500/30 text-sky-200 border-sky-400 font-bold shadow-sm'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/2 py-2 text-xs font-bold"
                  disabled={submittingReschedule}
                  onClick={() => {
                    setRescheduleTarget(null);
                    setRescheduleModalError(null);
                  }}
                >
                  Keep Current Slot
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="w-1/2 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white border-sky-500 shadow-glow-sky/20"
                  disabled={submittingReschedule}
                  onClick={handleConfirmReschedule}
                  icon={submittingReschedule ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  iconPosition="left"
                >
                  {submittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Secure Cancel Appointment Confirmation Modal ── */}
      <AnimatePresence>
        {cancelTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => {
              if (!submittingCancel) {
                setCancelTarget(null);
                setCancelReason('');
                setCancelModalError(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-lg w-full p-6 border border-rose-500/30 bg-navy-900/98 rounded-3xl space-y-4 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <CalendarX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    Cancel Appointment
                  </h3>
                  <p className="text-xs text-gray-400">
                    Review your consultation details before confirming cancellation.
                  </p>
                </div>
              </div>

              {/* Error Message inside modal */}
              {cancelModalError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{cancelModalError}</span>
                </div>
              )}

              {/* Appointment Details Card */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-[11px] font-mono font-bold text-accent px-2 py-0.5 rounded bg-accent/10 border border-accent/20">
                    {cancelTarget.appointmentId}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {cancelTarget.type === 'video' ? 'Virtual Video Consultation' : 'Hospital OPD Visit'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {cancelTarget.doctor.firstName ? cancelTarget.doctor.firstName[0] : 'D'}
                    {cancelTarget.doctor.lastName ? cancelTarget.doctor.lastName[0] : 'R'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-sm truncate">{cancelTarget.doctor.name}</h4>
                    <p className="text-[11px] text-accent font-medium truncate">{cancelTarget.doctor.specialization}</p>
                    <p className="text-[10px] text-gray-400 truncate">{cancelTarget.doctor.department}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span className="font-semibold text-white">{cancelTarget.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span className="font-semibold text-white">{cancelTarget.time}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason Selection */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Reason for Cancellation (Optional)
                </label>

                {/* Quick Selection Pills */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    'Schedule conflict',
                    'Feeling better / resolved',
                    'Need different specialist',
                    'Personal emergency',
                  ].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      disabled={submittingCancel}
                      onClick={() => setCancelReason(quick)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        cancelReason === quick
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {quick}
                    </button>
                  ))}
                </div>

                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Provide additional details or notes for the clinical team..."
                  rows={2}
                  maxLength={300}
                  disabled={submittingCancel}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none"
                />
              </div>

              {/* Hospital Policy Alert */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-200/90 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  Cancelling will immediately release this slot for other patients. You may book a new consultation or reschedule at any time.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-1/2 py-2 text-xs font-bold"
                  disabled={submittingCancel}
                  onClick={() => {
                    setCancelTarget(null);
                    setCancelReason('');
                    setCancelModalError(null);
                  }}
                >
                  Keep Appointment
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="w-1/2 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-glow-rose/20"
                  disabled={submittingCancel}
                  onClick={handleConfirmCancel}
                  icon={submittingCancel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  iconPosition="left"
                >
                  {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
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
