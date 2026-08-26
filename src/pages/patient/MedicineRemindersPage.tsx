import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  RotateCcw,
  Check,
  X,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as patientService from '../../services/patientService';
import type { MedicineReminder, MedicineReminderStatus } from '../../types';
import { getTallManName } from '../../utils/medicationSafety';

const FILTER_OPTIONS: { id: MedicineReminderStatus | 'All'; label: string; dotColor: string; badgeClass: string }[] = [
  { id: 'All', label: 'All Reminders', dotColor: 'bg-accent', badgeClass: 'bg-accent/20 text-accent border-accent/30' },
  { id: 'Due Now', label: 'Due Now', dotColor: 'bg-amber-400', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'Upcoming', label: 'Upcoming', dotColor: 'bg-sky-400', badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  { id: 'Taken', label: 'Taken', dotColor: 'bg-emerald-400', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'Missed', label: 'Missed', dotColor: 'bg-rose-400', badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'Completed', label: 'Completed', dotColor: 'bg-purple-400', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
];

export const MedicineRemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<MedicineReminderStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detail Modal
  const [selectedReminder, setSelectedReminder] = useState<MedicineReminder | null>(null);

  // Snooze Modal
  const [snoozeModalId, setSnoozeModalId] = useState<string | null>(null);
  const [snoozeMinutes, setSnoozeMinutes] = useState(30);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await patientService.getMedicineReminders();
      setReminders(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load medicine reminders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  // Auto-dismiss alert
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Actions
  const handleMarkTaken = async (id: string, name: string) => {
    try {
      const updated = await patientService.markMedicineTaken(id);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setSuccessMsg(`Marked ${name} as taken.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update reminder status.');
    }
  };

  const handleSnooze = async () => {
    if (!snoozeModalId) return;
    try {
      const updated = await patientService.snoozeMedicineReminder(snoozeModalId, snoozeMinutes);
      setReminders((prev) => prev.map((r) => (r.id === snoozeModalId ? updated : r)));
      setSuccessMsg(`Reminder snoozed for ${snoozeMinutes} minutes.`);
      setSnoozeModalId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to snooze reminder.');
    }
  };

  const handleDismiss = async (id: string, name: string) => {
    try {
      const updated = await patientService.dismissMedicineReminder(id);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setSuccessMsg(`Dismissed reminder for ${name}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to dismiss reminder.');
    }
  };

  const getStatusBadge = (status: MedicineReminderStatus) => {
    switch (status) {
      case 'Due Now':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Due Now
          </span>
        );
      case 'Upcoming':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Upcoming
          </span>
        );
      case 'Taken':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Taken
          </span>
        );
      case 'Missed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Missed
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/40">
            Completed
          </span>
        );
    }
  };

  const filteredReminders = reminders.filter((r) => {
    const matchesStatus = selectedFilter === 'All' || r.status === selectedFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      r.medicineName.toLowerCase().includes(query) ||
      r.doctorName.toLowerCase().includes(query) ||
      r.instructions.toLowerCase().includes(query) ||
      r.dosage.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const dueCount = reminders.filter((r) => r.status === 'Due Now').length;
  const upcomingCount = reminders.filter((r) => r.status === 'Upcoming').length;
  const takenCount = reminders.filter((r) => r.status === 'Taken').length;

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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-primary flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  Dosage Schedule & Adherence
                </span>
                {dueCount > 0 && (
                  <span className="text-xs text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                    {dueCount} Dose Due Now
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Medicine Reminders</h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Track your daily prescribed medication dosages, receive timely reminders, and log your adherence
              </p>
            </div>
          </div>
          <Button variant="glass" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadReminders}>
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* ── Adherence Summary Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Due Today</span>
            <p className="text-2xl font-black text-white mt-1">{dueCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Awaiting dosage intake</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-sky-500/30 bg-sky-500/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Upcoming Later</span>
            <p className="text-2xl font-black text-white mt-1">{upcomingCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Scheduled for afternoon/night</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Taken Today</span>
            <p className="text-2xl font-black text-white mt-1">{takenCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Successfully logged doses</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

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

      {/* ── Search & Filter Controls (Dropdown Selector) ── */}
      <div className="glass-card p-4 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-20">
        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine, dosage, doctor..."
            className="w-full py-2.5 pl-10 pr-9 text-xs sm:text-sm text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Menu for Status Filter */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap hidden md:flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-accent" />
            Status:
          </span>

          <div className="relative w-full sm:w-64" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-white flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 shadow-sm"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    FILTER_OPTIONS.find((opt) => opt.id === selectedFilter)?.dotColor || 'bg-accent'
                  }`}
                />
                <span className="font-semibold text-white">
                  {FILTER_OPTIONS.find((opt) => opt.id === selectedFilter)?.label || selectedFilter}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300 border border-white/10">
                  {selectedFilter === 'All'
                    ? reminders.length
                    : reminders.filter((r) => r.status === selectedFilter).length}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180 text-accent' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Popover */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1.5 p-1.5 rounded-xl bg-navy-950/95 backdrop-blur-xl border border-white/15 shadow-2xl z-50 space-y-1"
                >
                  {FILTER_OPTIONS.map((opt) => {
                    const count =
                      opt.id === 'All'
                        ? reminders.length
                        : reminders.filter((r) => r.status === opt.id).length;
                    const isSelected = selectedFilter === opt.id;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedFilter(opt.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white font-bold shadow-glow-primary'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                          <span>{opt.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-white/5 text-gray-400 border border-white/10'
                            }`}
                          >
                            {count}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Reminders Grid ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading your medicine reminders...</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
            <Bell className="w-7 h-7" />
          </div>
          <p className="text-base font-bold text-white">No medicine reminders scheduled.</p>
          <p className="text-xs text-gray-400 max-w-sm">
            {selectedFilter !== 'All'
              ? `No reminders currently categorized as "${selectedFilter}".`
              : 'You have no active medicine reminders at this time.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReminders.map((rem) => (
            <motion.div
              key={rem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card-interactive p-5 border flex flex-col justify-between space-y-4 ${
                rem.status === 'Due Now'
                  ? 'border-amber-500/40 bg-amber-500/[0.04]'
                  : rem.status === 'Taken'
                  ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                  : 'border-white/10'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400 font-medium">{rem.prescriptionId}</span>
                    {getStatusBadge(rem.status)}
                  </div>
                  <h3 className="text-lg font-bold text-white font-mono">{getTallManName(rem.medicineName)}</h3>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent text-xs font-bold border border-accent/30">
                    {rem.dosage}
                  </span>
                </div>
              </div>

              {/* Scheduled Time & Frequency */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 rounded-xl p-2.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Scheduled Time</span>
                    <span className="text-white font-bold">{rem.scheduledTime}</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Frequency</span>
                    <span className="text-white font-medium">{rem.frequency}</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider block">
                  Instructions:
                </span>
                <p className="text-gray-200">{rem.instructions}</p>
                {rem.snoozedUntil && (
                  <p className="text-amber-400 font-semibold text-[11px] pt-1">
                    ⏰ {rem.snoozedUntil}
                  </p>
                )}
                {rem.takenAt && (
                  <p className="text-emerald-400 font-semibold text-[11px] pt-1">
                    ✓ Logged at {rem.takenAt}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => setSelectedReminder(rem)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 py-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Details
                </button>

                <div className="flex items-center gap-2">
                  {rem.status !== 'Taken' && rem.status !== 'Completed' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Check className="w-3.5 h-3.5" />}
                        onClick={() => handleMarkTaken(rem.id, rem.medicineName)}
                      >
                        Mark as Taken
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                        onClick={() => setSnoozeModalId(rem.id)}
                      >
                        Snooze
                      </Button>
                    </>
                  )}
                  {rem.status !== 'Completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDismiss(rem.id, rem.medicineName)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedReminder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setSelectedReminder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-md w-full p-6 border border-white/20 bg-navy-900/98 rounded-2xl space-y-4 text-xs"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedReminder.medicineName}</h3>
                  <p className="text-gray-400">Prescription: {selectedReminder.prescriptionId}</p>
                </div>
                <button
                  onClick={() => setSelectedReminder(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {[
                  ['Dosage', selectedReminder.dosage],
                  ['Scheduled Intake', selectedReminder.scheduledTime],
                  ['Frequency', selectedReminder.frequency],
                  ['Duration', selectedReminder.duration],
                  ['Prescribing Doctor', selectedReminder.doctorName],
                  ['Status', selectedReminder.status],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-medium">{val}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                <span className="text-accent font-bold uppercase text-[10px] block mb-1">Doctor's Instructions</span>
                <p className="text-gray-200">{selectedReminder.instructions}</p>
              </div>

              <Button
                variant="glass"
                size="sm"
                className="w-full justify-center"
                onClick={() => setSelectedReminder(null)}
              >
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Snooze Modal ── */}
      <AnimatePresence>
        {snoozeModalId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setSnoozeModalId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-sm w-full p-6 border border-white/20 bg-navy-900/98 rounded-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto text-accent">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Snooze Medicine Reminder</h3>
              <p className="text-xs text-gray-300">Choose how long you would like to postpone this dose notification:</p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSnoozeMinutes(mins)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      snoozeMinutes === mins
                        ? 'bg-primary text-white border-primary-light shadow-glow-primary'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="primary" size="sm" className="flex-1 justify-center" onClick={handleSnooze}>
                  Confirm Snooze
                </Button>
                <Button variant="glass" size="sm" onClick={() => setSnoozeModalId(null)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MedicineRemindersPage;
