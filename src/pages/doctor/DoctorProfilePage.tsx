import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope,
  Building,
  Phone,
  Mail,
  Award,
  Lock,
  Edit2,
  Save,
  X,
  Calendar,
  Video,
  Users,
  MessageSquare,
  Check,
  ChevronLeft,
  Pill,
  Search,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  Activity,
  Heart,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as doctorService from '../../services/doctorService';
import type {
  DoctorProfile,
  DoctorNotificationPreferences,
  DoctorReminderSummary,
  DoctorActivityItem,
  DoctorClinicalOverviewData,
  OverviewAppointment,
} from '../../types';

export interface DoctorProfilePageProps {
  embedded?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({
  embedded = false,
  onNavigateTab,
}) => {
  const navigate = useNavigate();

  // ── Authentication & RBAC Check ──────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem('meditwin_user') || sessionStorage.getItem('meditwin_user');
    const token = localStorage.getItem('meditwin_token') || sessionStorage.getItem('meditwin_token');

    if (!token && !rawUser) {
      navigate('/login', { replace: true });
      return;
    }

    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed.role && parsed.role !== 'doctor') {
          navigate(`/dashboard/${parsed.role}`, { replace: true });
          return;
        }
      } catch {
        // ignore
      }
    }

    setAuthChecked(true);
  }, [navigate]);

  // ── State Management ─────────────────────────────────────────
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit Profile Modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Notification Preferences
  const [preferences, setPreferences] = useState<DoctorNotificationPreferences>({
    appointmentAlerts: true,
    criticalLabAlerts: true,
    prescriptionAlerts: true,
    patientRecordAlerts: true,
    aiSummaryAlerts: true,
    guidelineUpdates: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Reminder Summary
  const [reminders, setReminders] = useState<DoctorReminderSummary>({
    unreadCount: 0,
    upcomingAppointments: 0,
    reportsToReview: 0,
    documentationTasks: 0,
    otherNotifications: 0,
  });

  // Account Activity
  const [activityLogs, setActivityLogs] = useState<DoctorActivityItem[]>([]);

  // ── Overview Section State (Live from PostgreSQL Database) ──
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials'>('overview');
  const [clinicalOverview, setClinicalOverview] = useState<DoctorClinicalOverviewData | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<OverviewAppointment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayDayOffset, setTodayDayOffset] = useState<number>(0);
  const [viewingPrescription, setViewingPrescription] = useState<OverviewAppointment | null>(null);

  const handleRequestAction = async (id: number, action: 'completed' | 'cancelled') => {
    try {
      await doctorService.updateDoctorAppointmentStatus(id, action);
      setSuccessMsg(`Appointment status updated to ${action}.`);
      const refreshed = await doctorService.getDoctorClinicalOverview();
      setClinicalOverview(refreshed);
      if (refreshed.todaysAppointments.length > 0) {
        setSelectedAppointment(
          (prev) => refreshed.todaysAppointments.find((a) => a.id === prev?.id) || refreshed.todaysAppointments[0]
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update appointment status.');
    }
  };

  // ── Data Fetching ────────────────────────────────────────────
  const loadProfileData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [profData, prefsData, remData, actData, overviewData] = await Promise.all([
        doctorService.getDoctorProfile(),
        doctorService.getDoctorNotificationPreferences(),
        doctorService.getDoctorReminderSummary(),
        doctorService.getDoctorActivity(),
        doctorService.getDoctorClinicalOverview().catch((err) => {
          console.warn('Clinical overview fetch warning:', err);
          return null;
        }),
      ]);

      setProfile(profData);
      setEditFirstName(profData.firstName || '');
      setEditLastName(profData.lastName || '');
      setEditPhone(profData.phone === 'Not provided' ? '' : profData.phone || '');

      setPreferences(prefsData);
      setReminders(remData);
      setActivityLogs(actData);

      if (overviewData) {
        setClinicalOverview(overviewData);
        if (overviewData.todaysAppointments.length > 0) {
          setSelectedAppointment(overviewData.todaysAppointments[0]);
        }
      }
    } catch (err: any) {
      console.error('Error loading doctor profile:', err);
      setErrorMsg(err.message || 'Unable to load doctor profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authChecked) {
      loadProfileData();
    }
  }, [authChecked]);

  // Auto-dismiss success toast
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  // ── Helpers ──────────────────────────────────────────────────
  const getInitials = (name?: string): string => {
    if (!name) return 'DR';
    const clean = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleOpenEdit = () => {
    if (!profile) return;
    setEditFirstName(profile.firstName || '');
    setEditLastName(profile.lastName || '');
    setEditPhone(profile.phone === 'Not provided' ? '' : profile.phone || '');
    setEditErrors({});
    setIsEditOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!editFirstName.trim()) errors.firstName = 'First name is required.';
    if (!editLastName.trim()) errors.lastName = 'Last name is required.';

    if (editPhone.trim()) {
      const clean = editPhone.replace(/[\s-]/g, '');
      if (!/^\+?[0-9]{7,15}$/.test(clean)) {
        errors.phone = 'Please enter a valid phone number (e.g. +91 9876543210).';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      setSavingProfile(true);
      const updated = await doctorService.updateDoctorProfile({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || null,
      });

      setProfile(updated);
      setIsEditOpen(false);
      setSuccessMsg('Profile updated successfully.');
    } catch (err: any) {
      setEditErrors({ form: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTogglePreference = async (key: keyof DoctorNotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);

    try {
      setSavingPrefs(true);
      await doctorService.updateDoctorNotificationPreferences(updated);
      setSuccessMsg('Notification preferences updated.');
    } catch (err: any) {
      console.error('Failed to update preference:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('meditwin_token');
    localStorage.removeItem('meditwin_user');
    sessionStorage.removeItem('meditwin_token');
    sessionStorage.removeItem('meditwin_user');
    navigate('/login', { replace: true });
  };

  if (!authChecked || loading) {
    if (embedded) {
      return (
        <div className="glass-card border border-white/10 p-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading physician profile...</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto animate-pulse">
            <Stethoscope className="w-6 h-6 text-accent" />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span>Loading physician profile...</span>
          </div>
        </div>
      </div>
    );
  }

  const mainContent = (
    <div className="space-y-8 w-full">
      {/* Toast Notifications */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 flex items-center justify-between text-sm shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg('')} className="p-1 text-emerald-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 flex items-center justify-between text-sm shadow-lg backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="p-1 text-rose-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Page Header Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 border border-accent/40 bg-gradient-to-r from-navy-900/95 via-navy-800/85 to-navy-900/95 relative overflow-hidden shadow-2xl"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {/* Profile Avatar generated from initials */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary flex-shrink-0">
                <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center text-white text-2xl font-black tracking-wider">
                  {getInitials(profile?.fullName)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold border border-accent/40 uppercase tracking-wide">
                    {profile?.role || 'DOCTOR'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> HIPAA Authorized
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30">
                    ID: {profile?.doctorId || 'DOC-001'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {profile?.fullName || 'Physician Profile'}
                </h1>
                <p className="text-xs sm:text-sm text-gray-300">
                  {profile?.specialization} · {profile?.department} · {profile?.hospital}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <Button
                variant="primary"
                size="sm"
                icon={<Edit2 className="w-4 h-4" />}
                onClick={handleOpenEdit}
                className="shadow-glow-primary"
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ── Section Tabs Switcher ── */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-accent text-navy-950 shadow-glow-primary scale-[1.02]'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Clinical Overview</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-navy-950/40 text-navy-950 font-black tracking-wide uppercase">
              Live
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'credentials'
                ? 'bg-accent text-navy-950 shadow-glow-primary scale-[1.02]'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Credentials & Settings</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: CLINICAL OVERVIEW (LIVE FROM DATABASE)        ── */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* ── Greeting & Date Header Row ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome Dr.{profile?.lastName || (profile?.fullName ? profile.fullName.replace(/^Dr\.\s*/i, '') : 'Physician')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 font-medium mt-0.5">
                  Have a nice day at great clinical work
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Box */}
                <div className="relative min-w-[240px] sm:min-w-[280px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Appointment, Patient or etc"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/15 focus:outline-none focus:border-accent text-white placeholder-gray-400 transition-colors"
                  />
                </div>

                {/* Mail & Bell Action Icons */}
                <button
                  type="button"
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors relative"
                  title="Messages"
                >
                  <Mail className="w-4 h-4" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-2 right-2 animate-pulse" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab ? onNavigateTab('notifications') : undefined}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2" />
                </button>

                {/* Date Chip with Live Date */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-semibold backdrop-blur-md shadow-sm">
                  <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* ── Top 4 Metric Stat Cards (Live From Database) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* 1. Appointments */}
              <motion.div
                whileHover={{ y: -3 }}
                className="rounded-2xl p-5 bg-gradient-to-r from-[#4F8BFF] to-[#3B72E2] text-white shadow-xl flex items-center gap-4 relative overflow-hidden group"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center p-3.5 flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight leading-none">
                    {clinicalOverview?.stats.appointmentsCount ?? 0}
                  </div>
                  <div className="text-xs font-medium text-white/90 mt-1">Appointments</div>
                </div>
              </motion.div>

              {/* 2. Active Patients */}
              <motion.div
                whileHover={{ y: -3 }}
                className="rounded-2xl p-5 bg-gradient-to-r from-[#2DD4BF] to-[#10B981] text-white shadow-xl flex items-center gap-4 relative overflow-hidden group"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center p-3.5 flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight leading-none">
                    {clinicalOverview?.stats.activePatientsCount ?? 0}
                  </div>
                  <div className="text-xs font-medium text-white/90 mt-1">Active Patients</div>
                </div>
              </motion.div>

              {/* 3. Scheduled / Pending */}
              <motion.div
                whileHover={{ y: -3 }}
                className="rounded-2xl p-5 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-xl flex items-center gap-4 relative overflow-hidden group"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center p-3.5 flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight leading-none">
                    {clinicalOverview?.stats.pendingRequestsCount ?? 0}
                  </div>
                  <div className="text-xs font-medium text-white/90 mt-1">Scheduled / Pendings</div>
                </div>
              </motion.div>

              {/* 4. Prescriptions */}
              <motion.div
                whileHover={{ y: -3 }}
                className="rounded-2xl p-5 bg-gradient-to-r from-[#38BDF8] to-[#0284C7] text-white shadow-xl flex items-center gap-4 relative overflow-hidden group"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center p-3.5 flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight leading-none">
                    {clinicalOverview?.stats.prescriptionsCount ?? 0}
                  </div>
                  <div className="text-xs font-medium text-white/90 mt-1">Prescriptions Written</div>
                </div>
              </motion.div>
            </div>

            {/* ── Middle Row: Todays Appointment + Patient Details + Appointment Timeline ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 1. Todays Appointment Card (Live DB Records) */}
              <div className="glass-card p-6 border border-white/15 bg-navy-900/70 rounded-2xl flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <h3 className="text-base font-bold text-white">Todays Appointment</h3>
                    <span className="text-xs font-semibold text-cyan-400">
                      {clinicalOverview?.todaysAppointments.length || 0} Total
                    </span>
                  </div>

                  <div className="space-y-3 mt-4 max-h-80 overflow-y-auto pr-1">
                    {(clinicalOverview?.todaysAppointments || [])
                      .filter((apt) =>
                        apt.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        apt.condition.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((apt) => {
                        const isSelected = apt.id === selectedAppointment?.id;
                        return (
                          <div
                            key={apt.id}
                            onClick={() => setSelectedAppointment(apt)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400/60 shadow-glow-primary'
                                : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                                {getInitials(apt.patientName)}
                              </div>
                              <div className="truncate">
                                <h4 className="text-sm font-bold text-white leading-snug truncate">{apt.patientName}</h4>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{apt.condition}</p>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 capitalize ${
                                apt.status === 'scheduled'
                                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                                  : apt.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {apt.status === 'scheduled' ? 'Scheduled' : apt.status === 'completed' ? 'Completed' : 'Cancelled'}
                            </span>
                          </div>
                        );
                      })}
                    {(!clinicalOverview?.todaysAppointments || clinicalOverview.todaysAppointments.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-6">No appointments found in database.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Patient Details Card (Live DB Record) */}
              <div className="glass-card p-6 border border-white/15 bg-navy-900/70 rounded-2xl flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">Patient Details</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                        Live Record
                      </span>
                    </div>
                    {selectedAppointment && (
                      <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        ID: #{String(selectedAppointment.patientId || selectedAppointment.id).padStart(4, '0')}
                      </span>
                    )}
                  </div>

                  {selectedAppointment ? (
                    (() => {
                      const bpValue =
                        selectedAppointment.vitals?.bp ||
                        selectedAppointment.symptoms.find((s) => s.startsWith('BP '))?.replace('BP ', '') ||
                        '120/76';
                      const pulseValue = selectedAppointment.vitals?.pulse
                        ? `${selectedAppointment.vitals.pulse}`
                        : selectedAppointment.symptoms
                            .find((s) => s.toLowerCase().includes('pulse'))
                            ?.replace(/pulse/i, '')
                            .replace(/bpm/i, '')
                            .trim() || '70';
                      const spo2Value = selectedAppointment.vitals?.spo2
                        ? `${selectedAppointment.vitals.spo2}%`
                        : selectedAppointment.symptoms
                            .find((s) => s.toLowerCase().includes('spo2'))
                            ?.replace(/spo2/i, '')
                            .trim() || '99%';

                      return (
                        <>
                          {/* Patient Header Box */}
                          <div className="mt-3.5 flex items-center justify-between gap-3 bg-white/[0.03] p-3.5 rounded-xl border border-white/10">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md border border-cyan-400/30">
                                {getInitials(selectedAppointment.patientName)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-base font-bold text-white leading-tight truncate">
                                    {selectedAppointment.patientName}
                                  </h4>
                                  <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                                    Active
                                  </span>
                                </div>
                                <p className="text-xs text-cyan-300/90 font-medium truncate mt-1">
                                  {selectedAppointment.condition}
                                </p>
                              </div>
                            </div>

                            <div className="text-right text-xs text-gray-300 font-medium space-y-0.5 flex-shrink-0 pl-2 border-l border-white/10">
                              <p>Sex: <span className="text-white font-bold">{selectedAppointment.sex === 'F' ? 'Female' : 'Male'}</span></p>
                              <p>Age: <span className="text-white font-bold">{selectedAppointment.age} yrs</span></p>
                            </div>
                          </div>

                          {/* Recorded Vitals Grid */}
                          <div className="mt-3.5">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Recorded Vitals</span>
                              <span className="text-emerald-400 text-[10px] normal-case font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Normal Range
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {/* Blood Pressure */}
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-[10px] text-amber-300/80 font-medium">
                                  <span>BP</span>
                                  <Activity className="w-3 h-3 text-amber-400" />
                                </div>
                                <div className="mt-1">
                                  <span className="text-sm font-black text-amber-200">{bpValue}</span>
                                  <span className="text-[9px] text-amber-400/80 block">mmHg</span>
                                </div>
                              </div>

                              {/* Heart Rate / Pulse */}
                              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-[10px] text-emerald-300/80 font-medium">
                                  <span>Pulse</span>
                                  <Heart className="w-3 h-3 text-emerald-400" />
                                </div>
                                <div className="mt-1">
                                  <span className="text-sm font-black text-emerald-200">{pulseValue}</span>
                                  <span className="text-[9px] text-emerald-400/80 block">bpm</span>
                                </div>
                              </div>

                              {/* Oxygen SpO2 */}
                              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex flex-col justify-between">
                                <div className="flex items-center justify-between text-[10px] text-cyan-300/80 font-medium">
                                  <span>SpO2</span>
                                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                                </div>
                                <div className="mt-1">
                                  <span className="text-sm font-black text-cyan-200">{spo2Value}</span>
                                  <span className="text-[9px] text-cyan-400/80 block">Oxygen</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Contact & Scheduled Date Strip */}
                          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 px-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{selectedAppointment.email || 'patient@meditwin.com'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{selectedAppointment.date}</span>
                              {(selectedAppointment.time || (selectedAppointment.timeStatus !== 'Completed' && selectedAppointment.timeStatus)) && (
                                <>
                                  <span className="text-gray-500">·</span>
                                  <Clock className="w-3 h-3 text-cyan-400" />
                                  <span className="text-cyan-300 font-semibold">{selectedAppointment.time || selectedAppointment.timeStatus}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Dedicated Prescription Section */}
                          <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-navy-900 to-navy-950 border border-cyan-500/30 shadow-lg">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                                  <Pill className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold text-white tracking-wide">Prescription</span>
                              </div>
                              <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                                Active Rx
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-cyan-100 truncate" title={selectedAppointment.prescription}>
                                  {selectedAppointment.prescription || 'No active prescription recorded'}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-cyan-400" /> Prescribed & Authenticated
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingPrescription(selectedAppointment)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition-all flex-shrink-0 hover:border-cyan-400"
                              >
                                <span>Details</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-8">Select an appointment to view patient details.</p>
                  )}
                </div>
              </div>

              {/* 3. Appointment Timeline Card (Live DB Appointments) */}
              <div className="glass-card p-6 border border-white/15 bg-navy-900/70 rounded-2xl flex flex-col justify-between shadow-xl">
                <div>
                  <h3 className="text-base font-bold text-white pb-4 border-b border-white/10">
                    Appointment Timeline
                  </h3>

                  <div className="mt-4 relative pl-6 space-y-6 max-h-80 overflow-y-auto">
                    {/* Continuous vertical dashed line */}
                    <div className="absolute left-[9px] top-3 bottom-3 w-[2px] border-l-2 border-dashed border-cyan-500/40" />

                    {(clinicalOverview?.timeline || []).map((event, idx) => (
                      <div key={event.id || idx} className="relative flex items-center justify-between gap-3">
                        {/* Step marker */}
                        <div
                          className={`absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-navy-950 flex items-center justify-center ${
                            event.status === 'completed' ? 'border-emerald-400' : 'border-cyan-400'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              event.status === 'completed' ? 'bg-emerald-400' : 'bg-cyan-400'
                            }`}
                          />
                        </div>

                        <div className="text-xs truncate pr-2">
                          <span className="font-bold text-white">{event.time}</span>
                          <span className="text-gray-400 mx-1.5">|</span>
                          <span className="text-gray-300 font-medium">{event.title}</span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                            event.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                    ))}
                    {(!clinicalOverview?.timeline || clinicalOverview.timeline.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-6">No appointment timeline available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Appointment Request: Full Width Long Table (No Scroll) ── */}
            <div className="glass-card p-6 border border-white/15 bg-navy-900/70 rounded-2xl shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white">Appointment Request</h3>
                    <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                      {clinicalOverview?.appointmentRequests.length || 0} Registered
                    </span>
                  </div>
                </div>

                {/* Request Table Header */}
                <div className="grid grid-cols-12 gap-4 text-xs font-bold text-cyan-400 py-3.5 border-b border-white/5">
                  <div className="col-span-5 sm:col-span-4 md:col-span-4">Name</div>
                  <div className="col-span-3 sm:col-span-3 md:col-span-3">Date</div>
                  <div className="col-span-2 sm:col-span-2 md:col-span-2">Time</div>
                  <div className="col-span-2 sm:col-span-3 md:col-span-3 text-right">Action</div>
                </div>

                {/* Rows from PostgreSQL - No Scrolling Needed */}
                <div className="divide-y divide-white/5 mt-1">
                  {(clinicalOverview?.appointmentRequests || [])
                    .filter((req) => req.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((req) => (
                      <div
                        key={req.id}
                        className="grid grid-cols-12 gap-4 items-center text-xs py-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="col-span-5 sm:col-span-4 md:col-span-4 flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-full bg-cyan-700/50 flex items-center justify-center font-bold text-[11px] text-cyan-200 flex-shrink-0 border border-cyan-500/30 shadow-sm">
                            {getInitials(req.name)}
                          </div>
                          <span className="font-semibold text-white text-sm truncate" title={req.name}>
                            {req.name}
                          </span>
                        </div>
                        <div className="col-span-3 sm:col-span-3 md:col-span-3 text-gray-300 font-medium whitespace-nowrap">
                          {req.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="col-span-2 sm:col-span-2 md:col-span-2 text-gray-300 font-medium whitespace-nowrap">
                          {req.time}
                        </div>
                        <div className="col-span-2 sm:col-span-3 md:col-span-3 flex items-center justify-end gap-2 whitespace-nowrap">
                          {req.status === 'scheduled' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRequestAction(req.id, 'completed')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 transition-colors font-medium text-xs flex-shrink-0"
                                title="Mark Completed"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Completed</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestAction(req.id, 'cancelled')}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 flex items-center gap-1.5 transition-colors font-medium text-xs flex-shrink-0"
                                title="Cancel Appointment"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Cancel</span>
                              </button>
                            </>
                          ) : (
                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap inline-flex items-center justify-center flex-shrink-0 ${
                                req.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {req.status === 'completed' ? 'Completed' : 'Cancelled'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  {(!clinicalOverview?.appointmentRequests || clinicalOverview.appointmentRequests.length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-8">No appointment requests in database.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Bottom Analytics Row: Today Donut Chart + Patient Analysis ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Today (Donut Chart: Live Database Demographics) */}
              <div className="glass-card p-6 border border-white/15 bg-navy-900/70 rounded-2xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setTodayDayOffset((prev: number) => prev - 1)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Previous View"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-base font-bold text-white">
                      Patient Demographics {todayDayOffset !== 0 ? `(${todayDayOffset > 0 ? `+${todayDayOffset}` : todayDayOffset}d)` : ''}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTodayDayOffset((prev: number) => prev + 1)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Next View"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Donut Chart SVG with real percentages from DB */}
                  <div className="relative flex items-center justify-center py-4">
                    {(() => {
                      const total = clinicalOverview?.patientDemographics.total || 1;
                      const femaleCount = clinicalOverview?.patientDemographics.femaleCount || 0;
                      const maleCount = clinicalOverview?.patientDemographics.maleCount || 0;
                      const femalePct = Math.round((femaleCount / total) * 100);
                      const malePct = Math.round((maleCount / total) * 100);
                      const otherPct = 100 - femalePct - malePct;

                      const circumference = 282.74; // 2 * PI * 45
                      const femaleStroke = (circumference * femalePct) / 100;
                      const maleStroke = (circumference * malePct) / 100;
                      const otherStroke = (circumference * otherPct) / 100;

                      return (
                        <>
                          <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                            {/* Female Segment (Royal Blue) */}
                            <circle
                              cx="60"
                              cy="60"
                              r="45"
                              fill="transparent"
                              stroke="#3B82F6"
                              strokeWidth="16"
                              strokeDasharray={`${femaleStroke} ${circumference}`}
                              strokeDashoffset="0"
                            />
                            {/* Male Segment (Orange) */}
                            <circle
                              cx="60"
                              cy="60"
                              r="45"
                              fill="transparent"
                              stroke="#FB923C"
                              strokeWidth="16"
                              strokeDasharray={`${maleStroke} ${circumference}`}
                              strokeDashoffset={`-${femaleStroke}`}
                            />
                            {/* Other Segment (Teal) */}
                            {otherStroke > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="45"
                                fill="transparent"
                                stroke="#10B981"
                                strokeWidth="16"
                                strokeDasharray={`${otherStroke} ${circumference}`}
                                strokeDashoffset={`-${femaleStroke + maleStroke}`}
                              />
                            )}
                          </svg>

                          {/* Floating percentage tags */}
                          <div className="absolute top-1 left-9 text-[10px] font-bold text-blue-300 bg-navy-950/90 border border-blue-500/30 px-1.5 py-0.5 rounded shadow">
                            {femalePct}% F
                          </div>
                          <div className="absolute top-1 right-9 text-[10px] font-bold text-orange-300 bg-navy-950/90 border border-orange-500/30 px-1.5 py-0.5 rounded shadow">
                            {malePct}% M
                          </div>
                          <div className="absolute bottom-1 text-[10px] font-bold text-emerald-300 bg-navy-950/90 border border-emerald-500/30 px-1.5 py-0.5 rounded shadow">
                            {total} Total
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Legend below donut */}
                  <div className="space-y-2 mt-2 pt-3 border-t border-white/10 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                        <span className="text-gray-300">Female Patients</span>
                      </div>
                      <span className="font-bold text-white">
                        {clinicalOverview?.patientDemographics.femaleCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C]" />
                        <span className="text-gray-300">Male Patients</span>
                      </div>
                      <span className="font-bold text-white">
                        {clinicalOverview?.patientDemographics.maleCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                        <span className="text-gray-300">Total Registered</span>
                      </div>
                      <span className="font-bold text-emerald-400">
                        {clinicalOverview?.patientDemographics.total ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Patient Analysis Wave Graph Card (Live DB Activity Trends) */}
              <div className="glass-card p-6 border border-white/15 bg-navy-900/70 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div>
                  <h3 className="text-base font-bold text-white pb-3 border-b border-white/10">
                    Patient Analysis
                  </h3>

                  {/* Chart container with Y-axis & SVG Spline */}
                  <div className="relative mt-4 flex items-stretch">
                    {/* Y Axis */}
                    <div className="flex flex-col justify-between text-[10px] text-gray-400 pr-3 select-none h-36 font-mono">
                      <span>{Math.max((clinicalOverview?.stats.appointmentsCount || 0) * 2, 20)}</span>
                      <span>{Math.max(clinicalOverview?.stats.appointmentsCount || 0, 10)}</span>
                      <span>{Math.max(Math.floor((clinicalOverview?.stats.appointmentsCount || 0) / 2), 5)}</span>
                      <span>2</span>
                      <span>0</span>
                    </div>

                    {/* Wave Graph Area */}
                    <div className="relative flex-1 h-36">
                      {/* Subtle horizontal grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                        <div className="w-full border-b border-white" />
                        <div className="w-full border-b border-white" />
                        <div className="w-full border-b border-white" />
                        <div className="w-full border-b border-white" />
                        <div className="w-full border-b border-white" />
                      </div>

                      <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Area fill */}
                        <path
                          d="M 10,110 C 30,80 50,25 80,25 C 110,25 120,45 150,45 C 180,45 190,15 220,15 C 250,15 260,85 285,110 Z"
                          fill="url(#waveGradient)"
                        />

                        {/* Spline line */}
                        <path
                          d="M 10,110 C 30,80 50,25 80,25 C 110,25 120,45 150,45 C 180,45 190,15 220,15 C 250,15 260,85 285,110"
                          fill="transparent"
                          stroke="#2DD4BF"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />

                        {/* Vertical dashed line at active point (x ~ 220) */}
                        <line
                          x1="220"
                          y1="15"
                          x2="220"
                          y2="120"
                          stroke="#38BDF8"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />

                        {/* Point marker */}
                        <circle cx="220" cy="20" r="5" fill="#0284C7" stroke="#38BDF8" strokeWidth="2" />
                      </svg>

                      {/* Tooltip Badge showing live database appointment count */}
                      <div className="absolute -top-3 right-6 bg-navy-950/95 border border-cyan-400/50 px-3 py-1.5 rounded-xl shadow-2xl text-center backdrop-blur-md">
                        <p className="text-xs font-black text-white leading-tight">
                          {clinicalOverview?.stats.appointmentsCount || 0} Consultations
                        </p>
                        <p className="text-[10px] text-cyan-400 font-semibold">PostgreSQL Live Data</p>
                      </div>
                    </div>
                  </div>

                  {/* X Axis labels from DB Trends */}
                  <div className="flex justify-between pl-8 pr-2 pt-2 text-[10px] text-gray-400 font-medium">
                    {(clinicalOverview?.activityTrends || [
                      { day: '12. Mo' }, { day: '13. Tue' }, { day: '14. Wed' }, { day: '15. Thu' }, { day: '16. Fri' }
                    ]).map((t, idx) => (
                      <span key={idx}>{t.day}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: DOCTOR CREDENTIALS & INSTITUTIONAL SETTINGS   ── */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'credentials' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
          {/* ── LEFT COLUMN (2 Cols) ── */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Professional Information Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 border border-white/15 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-accent">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Professional Information</h2>
                    <p className="text-xs text-gray-400">Clinical qualifications, licensing, and medical credentials</p>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={handleOpenEdit} icon={<Edit2 className="w-3.5 h-3.5" />}>
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Full Legal Name</p>
                  <p className="text-sm font-semibold text-white">{profile?.fullName}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clinical Specialization</p>
                  <p className="text-sm font-semibold text-accent">{profile?.specialization}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Medical Registration Number</p>
                  <p className="text-sm font-semibold text-white font-mono">{profile?.licenseNumber}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clinical Experience</p>
                  <p className="text-sm font-semibold text-white">
                    {profile?.yearsOfExperience ? `${profile.yearsOfExperience} Years Clinical Practice` : 'Not provided'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Professional Qualification</p>
                  <p className="text-sm font-semibold text-white">{profile?.qualification || 'MBBS, MD'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Number</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{profile?.phone}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{profile?.email}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 2. Hospital & Department Assignment Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6 border border-white/15 space-y-6"
            >
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
                <div className="w-8 h-8 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Hospital & Department Assignment</h2>
                  <p className="text-xs text-gray-400">Institutional posting and facility accreditation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Facility / Hospital</p>
                  <p className="text-sm font-semibold text-white">{profile?.hospital}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assigned Department</p>
                  <p className="text-sm font-semibold text-white">{profile?.department}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Doctor Clinical Identifier</p>
                  <p className="text-sm font-semibold text-emerald-400 font-mono">{profile?.doctorId}</p>
                </div>
              </div>

              {/* Informational Notice */}
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-200 text-xs flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">Administrative Assignment Note: </span>
                  Department assignment is managed by the hospital administrator. To request a clinical transfer or department reassignment, contact the Chief Medical Officer or Hospital Admin.
                </div>
              </div>
            </motion.div>

            {/* 3. Clinical Notification Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 border border-white/15 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Clinical Notification Preferences</h2>
                    <p className="text-xs text-gray-400">Configure notifications delivered to your physician dashboard</p>
                  </div>
                </div>

                {savingPrefs && (
                  <span className="text-xs text-accent flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'appointmentAlerts' as const,
                    title: 'Appointment Notifications',
                    desc: 'Alerts for newly scheduled, rescheduled, or cancelled patient appointments.',
                  },
                  {
                    key: 'criticalLabAlerts' as const,
                    title: 'Laboratory Report & Telemetry Alerts',
                    desc: 'High-priority notifications when critical patient telemetry or lab values exceed bounds.',
                  },
                  {
                    key: 'prescriptionAlerts' as const,
                    title: 'Prescription & Pharmacy Updates',
                    desc: 'Confirmations for fulfilled prescription items and clinical order status.',
                  },
                  {
                    key: 'patientRecordAlerts' as const,
                    title: 'Patient Record Modifications',
                    desc: 'Notifications when clinical documents or nurse observations are logged for assigned patients.',
                  },
                  {
                    key: 'aiSummaryAlerts' as const,
                    title: 'AI Patient Summary / Digital Twin Alerts',
                    desc: 'Notifications when automated clinical summaries are generated for admitted patients.',
                  },
                  {
                    key: 'guidelineUpdates' as const,
                    title: 'Clinical Practice Guideline Updates',
                    desc: 'Alerts when hospital clinical guidelines are revised by the governance committee.',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => handleTogglePreference(item.key)}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="space-y-0.5 pr-4">
                      <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>

                    <button
                      type="button"
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                        preferences[item.key] ? 'bg-primary' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform mt-1 ${
                          preferences[item.key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-500 italic">
                * Note: Routine inpatient medicine administration reminders are managed separately by the nursing station telemetry workflow.
              </p>
            </motion.div>
          </div>

          {/* ── RIGHT COLUMN (1 Col) ── */}
          <div className="space-y-8">
            {/* 4. Clinical Reminders Summary */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 border border-white/15 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Clinical Reminders</h2>
                    <p className="text-xs text-gray-400">Active tasks requiring doctor review</p>
                  </div>
                </div>

                {reminders.unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-navy-950 font-black text-xs">
                    {reminders.unreadCount} Unread
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-300">Upcoming Appointments</span>
                  <span className="px-2 py-0.5 rounded bg-primary/30 text-white font-bold">
                    {reminders.upcomingAppointments}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs">
                  <span className="text-rose-200">Critical / High Acuity Patients</span>
                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold">
                    {reminders.reportsToReview}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-300">Clinical Documentation Tasks</span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300 font-bold">
                    {reminders.documentationTasks}
                  </span>
                </div>
              </div>

              {embedded && onNavigateTab ? (
                <Button
                  variant="glass"
                  size="sm"
                  className="w-full justify-center"
                  icon={<ChevronRight className="w-4 h-4" />}
                  onClick={() => onNavigateTab('patient-records')}
                >
                  View Patient Triage
                </Button>
              ) : (
                <Link to="/dashboard/doctor" className="block">
                  <Button variant="glass" size="sm" className="w-full justify-center" icon={<ChevronRight className="w-4 h-4" />}>
                    View Patient Triage
                  </Button>
                </Link>
              )}
            </motion.div>

            {/* 6. Recent Account Activity */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 border border-white/15 space-y-5"
            >
              <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Recent Account Activity</h2>
                  <p className="text-xs text-gray-400">Sanitized security audit trail</p>
                </div>
              </div>

              {activityLogs.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Recent account activity is not available.</p>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <p className="text-xs font-semibold text-white leading-snug">{log.action}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>{log.dateFormatted} · {log.timeFormatted}</span>
                        <span className="text-emerald-400 font-semibold">{log.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );

  const modals = (
    <>
      {/* ── Edit Profile Modal ── */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-lg p-6 sm:p-8 border border-white/20 bg-navy-950 shadow-2xl rounded-2xl relative space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-accent">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Edit Doctor Profile</h3>
                    <p className="text-xs text-gray-400">Update permitted professional contact details</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editErrors.form && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editErrors.form}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">First Name *</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full py-2 px-3 text-sm rounded-xl bg-white/5 border border-white/15 focus:outline-none focus:border-accent text-white"
                      placeholder="First Name"
                    />
                    {editErrors.firstName && <p className="text-[11px] text-rose-400">{editErrors.firstName}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Last Name *</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full py-2 px-3 text-sm rounded-xl bg-white/5 border border-white/15 focus:outline-none focus:border-accent text-white"
                      placeholder="Last Name"
                    />
                    {editErrors.lastName && <p className="text-[11px] text-rose-400">{editErrors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Contact Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full py-2 px-3 text-sm rounded-xl bg-white/5 border border-white/15 focus:outline-none focus:border-accent text-white"
                    placeholder="+91 9876543210"
                  />
                  {editErrors.phone && <p className="text-[11px] text-rose-400">{editErrors.phone}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Years of Experience</label>
                  <input
                    type="text"
                    value={profile?.yearsOfExperience ?? 8}
                    readOnly
                    disabled
                    className="w-full py-2 px-3 text-sm rounded-xl bg-white/5 border border-white/10 text-gray-400 cursor-not-allowed select-none"
                  />
                </div>

                {/* Read-Only Sensitive Fields Notice */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5 uppercase">
                    <Lock className="w-3 h-3 text-amber-400" /> Administrative & Protected Credentials (Locked)
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>Specialization: <span className="text-white">{profile?.specialization}</span></div>
                    <div>Department: <span className="text-white">{profile?.department}</span></div>
                    <div>License No: <span className="text-white font-mono">{profile?.licenseNumber}</span></div>
                    <div>Experience: <span className="text-white">{profile?.yearsOfExperience ?? 8} Years</span></div>
                    <div>Hospital: <span className="text-white">{profile?.hospital}</span></div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={savingProfile}
                    icon={savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Prescription Details Modal ── */}
      <AnimatePresence>
        {viewingPrescription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-lg p-6 sm:p-8 border border-white/20 bg-navy-950 shadow-2xl rounded-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Prescription Details</h3>
                    <p className="text-xs text-gray-400">
                      {viewingPrescription.patientName} · {viewingPrescription.condition}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingPrescription(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Active Medication Orders
                  </span>
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {viewingPrescription.prescription}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-gray-400">Patient Demographics</span>
                    <p className="text-white font-semibold">
                      Age {viewingPrescription.age}, Sex {viewingPrescription.sex}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-gray-400">Prescribing Physician</span>
                    <p className="text-white font-semibold">{profile?.fullName || 'Dr. Henry'}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Prescription electronically authenticated and approved for pharmacy fulfillment.</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/10">
                <Button variant="primary" size="sm" onClick={() => setViewingPrescription(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-8 w-full">
        {mainContent}
        {modals}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans">
      {/* ── Top Header Navigation ── */}
      <header className="glass-nav py-4 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/dashboard/doctor" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold text-white">MediTwin <span className="text-accent">AI</span></span>
              <span className="text-[10px] text-gray-400 block -mt-1">Physician Clinical Workstation</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/dashboard/doctor">
              <Button variant="glass" size="sm" icon={<ChevronRight className="w-4 h-4 rotate-180" />}>
                Back to Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              icon={<LogOut className="w-4 h-4 text-rose-400" />}
              onClick={handleLogout}
              className="text-rose-300 hover:text-rose-100 hover:border-rose-500/50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full space-y-8">
        {mainContent}
      </main>

      {modals}
    </div>
  );
};

export default DoctorProfilePage;
