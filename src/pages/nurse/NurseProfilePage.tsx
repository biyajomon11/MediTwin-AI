import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope,
  Building2,
  Phone,
  Mail,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  Activity,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Loader2,
  Check,
} from 'lucide-react';
import * as nurseService from '../../services/nurseService';
import type {
  NurseProfile,
  NurseNotificationPreferences,
  NurseReminderSummary,
  NurseActivityItem,
} from '../../types';

export interface NurseProfilePageProps {
  embedded?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const NurseProfilePage: React.FC<NurseProfilePageProps> = ({
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
        if (parsed.role && parsed.role !== 'nurse' && parsed.role !== 'admin') {
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
  const [profile, setProfile] = useState<NurseProfile | null>(null);
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
  const [preferences, setPreferences] = useState<NurseNotificationPreferences>({
    patientAssignmentAlerts: true,
    medicineReminderAlerts: true,
    doctorCommunicationAlerts: true,
    procedureUpdateAlerts: true,
    criticalVitalAlerts: true,
    shiftHandoffAlerts: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Reminder Summary
  const [reminders, setReminders] = useState<NurseReminderSummary>({
    unreadCount: 0,
    dueTodayCount: 0,
    urgentCount: 0,
    activeWardPatients: 0,
    pendingSummaries: 0,
  });

  // Account Activity
  const [activityLogs, setActivityLogs] = useState<NurseActivityItem[]>([]);

  // ── Data Fetching ────────────────────────────────────────────
  const loadProfileData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [profData, prefsData, remData, actData] = await Promise.all([
        nurseService.getNurseProfile(),
        nurseService.getNurseNotificationPreferences().catch(() => ({
          patientAssignmentAlerts: true,
          medicineReminderAlerts: true,
          doctorCommunicationAlerts: true,
          procedureUpdateAlerts: true,
          criticalVitalAlerts: true,
          shiftHandoffAlerts: true,
        })),
        nurseService.getNurseReminderSummary().catch(() => ({
          unreadCount: 0,
          dueTodayCount: 0,
          urgentCount: 0,
          activeWardPatients: 0,
          pendingSummaries: 0,
        })),
        nurseService.getNurseActivity().catch(() => []),
      ]);

      setProfile(profData);
      setEditFirstName(profData.firstName || '');
      setEditLastName(profData.lastName || '');
      setEditPhone(profData.phone === 'Not provided' ? '' : profData.phone || '');

      setPreferences(prefsData);
      setReminders(remData);
      setActivityLogs(actData);
    } catch (err: any) {
      console.error('Error loading nurse profile:', err);
      setErrorMsg(err.message || 'Unable to load nurse profile. Please try again.');
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
  const getInitials = (firstName?: string, lastName?: string): string => {
    if (!firstName && !lastName) return 'RN';
    const first = firstName ? firstName.trim()[0] : '';
    const last = lastName ? lastName.trim()[0] : '';
    return `${first}${last}`.toUpperCase() || 'RN';
  };

  // ── Handlers: Edit Profile ───────────────────────────────────
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
      const updated = await nurseService.updateNurseProfile({
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

  // ── Handlers: Toggle Notification Preferences ────────────────
  const handleTogglePreference = async (key: keyof NurseNotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);

    try {
      setSavingPrefs(true);
      await nurseService.updateNurseNotificationPreferences(updated);
      setSuccessMsg('Notification preferences updated.');
    } catch (err: any) {
      console.error('Failed to update preference:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Handlers: Logout ─────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('meditwin_token');
    localStorage.removeItem('meditwin_user');
    sessionStorage.removeItem('meditwin_token');
    sessionStorage.removeItem('meditwin_user');
    navigate('/login', { replace: true });
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 p-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <p className="text-sm font-medium">Loading nurse profile from PostgreSQL…</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 pb-16 text-left ${embedded ? '' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'}`}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Toast Messages */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500 text-white font-medium text-sm shadow-2xl border border-emerald-400"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-200">{errorMsg}</p>
            <p className="text-xs text-rose-300/80 mt-0.5">Please check your network connection or session token.</p>
          </div>
          <button
            onClick={loadProfileData}
            className="px-3 py-1 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg border border-rose-500/40 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. Profile Header Card */}
      {/* ───────────────────────────────────────────────────────────── */}
      {profile && (
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-navy-900/90 via-navy-850/90 to-navy-900/90 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Avatar with initials */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 border-2 border-sky-400/40 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-sky-500/20 flex-shrink-0">
                {getInitials(profile.firstName, profile.lastName)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-navy-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-sm" title="Active Account">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

            {/* Header Identity Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {profile.fullName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {profile.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {profile.accountStatus}
                </span>
              </div>

              <p className="text-sm font-semibold text-sky-300 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-sky-400" />
                Staff Registered Nurse · {profile.departmentName}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-1">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  {profile.hospitalName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  ID: <strong className="text-gray-300">{profile.nurseId}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Unit: <strong className="text-emerald-400">{profile.assignedWard}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <button
              onClick={handleOpenEdit}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-sky-200 border border-sky-500/30 transition-all cursor-pointer shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2 & 3. Professional Information & Hospital Info Grid */}
      {/* ───────────────────────────────────────────────────────────── */}
      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Professional Information Card */}
          <div className="p-6 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-sky-400" />
                Professional Information
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
                Official Registry
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">First Name</p>
                <p className="text-sm font-semibold text-white">{profile.firstName}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Last Name</p>
                <p className="text-sm font-semibold text-white">{profile.lastName}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">Nurse ID</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">PROTECTED</span>
                </div>
                <p className="text-sm font-mono font-bold text-sky-300">{profile.nurseId}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">Registration Number</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">PROTECTED</span>
                </div>
                <p className="text-sm font-mono font-bold text-white">{profile.registrationNumber}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">Nursing License No.</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">PROTECTED</span>
                </div>
                <p className="text-sm font-mono font-bold text-white">{profile.licenseNumber}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400">Assigned Ward / Unit</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">ALLOCATED</span>
                </div>
                <p className="text-sm font-semibold text-emerald-400">{profile.assignedWard}</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Contact Phone</p>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  {profile.phone}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Registered Email</p>
                <p className="text-sm font-semibold text-white flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Credentials and Registration details are certified under Hospital Nursing Governance. Changes to license number or ward assignment require Admin authorization.
              </p>
            </div>
          </div>

          {/* Hospital & Department Information Card */}
          <div className="p-6 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Hospital & Department Assignment
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Verified Facility
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Assigned Hospital Facility</p>
                <p className="text-base font-bold text-white">{profile.hospitalName}</p>
                <p className="text-gray-400 text-[11px]">
                  {profile.hospitalAddress} · {profile.hospitalCity}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <p className="text-[11px] text-gray-400">Department</p>
                  <p className="text-sm font-bold text-white">{profile.departmentName}</p>
                  <p className="text-[10px] text-gray-500">Dept ID: {profile.departmentId || 'Main'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <p className="text-[11px] text-gray-400">Hospital Contact Line</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {profile.hospitalPhone}
                  </p>
                  <p className="text-[10px] text-gray-500">24/7 Clinical Switchboard</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
                <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Hospital Governance Scope</p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Hospital SOPs Authorized
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Inpatient Telemetry Access
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Medicine Reminders Protocol
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Hospital isolation is strictly enforced. Clinical charts, procedures, and patient allocations remain bounded to {profile.hospitalName}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. Reminders Summary Strip */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Clinical Reminders & Unit Workload Summary
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live operational metrics for your allocated unit ({profile?.assignedWard || 'General Ward 2B'}).
            </p>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Unread Alerts</p>
            <p className="text-2xl font-black text-white mt-1">{reminders.unreadCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">System notifications</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">Due Today</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{reminders.dueTodayCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Medication & care rounds</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Urgent Vitals</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{reminders.urgentCount}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Threshold deviations</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Ward Inpatients</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{reminders.activeWardPatients}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Assigned to your unit</p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5 & 6. Notification Preferences & Security Details Grid */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Preferences Card */}
        <div className="p-6 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-400" />
                Notification Preferences
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Customize alerts received during your shift.</p>
            </div>
            {savingPrefs && <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />}
          </div>

          <div className="space-y-3">
            {[
              {
                key: 'patientAssignmentAlerts' as const,
                title: 'Patient Assignment Notifications',
                desc: 'Alert when a new inpatient is admitted or allocated to your ward',
              },
              {
                key: 'medicineReminderAlerts' as const,
                title: 'Medicine Reminder Alerts',
                desc: 'Timely reminders for scheduled inpatient medication rounds',
              },
              {
                key: 'doctorCommunicationAlerts' as const,
                title: 'Doctor Communication & Orders',
                desc: 'Alerts when attending physicians issue new orders or treatment updates',
              },
              {
                key: 'procedureUpdateAlerts' as const,
                title: 'Hospital SOP & Procedure Updates',
                desc: 'Notifications when hospital clinical procedures or guidelines change',
              },
              {
                key: 'criticalVitalAlerts' as const,
                title: 'Critical Vital Telemetry Alerts',
                desc: 'Urgent alerts when patient vitals breach NEWS2 safety thresholds',
              },
              {
                key: 'shiftHandoffAlerts' as const,
                title: 'Shift Handoff Documentation',
                desc: 'Reminders for nursing shift handoffs and pending summary completions',
              },
            ].map(({ key, title, desc }) => {
              const enabled = preferences[key];

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs font-bold text-white">{title}</p>
                    <p className="text-[11px] text-gray-400">{desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePreference(key)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enabled ? 'bg-sky-500' : 'bg-white/20'
                    }`}
                    role="switch"
                    aria-checked={enabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Account Information Card */}
        <div className="p-6 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Account Information & Security
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              JWT Authenticated
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Account Role</p>
                <p className="text-sm font-bold text-white">{profile?.role}</p>
                <p className="text-[10px] text-gray-500">Read-Only Protected</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Account Status</p>
                <p className="text-sm font-bold text-emerald-400">{profile?.accountStatus}</p>
                <p className="text-[10px] text-gray-500">PostgreSQL Active</p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Account Created</p>
                <p className="text-xs font-medium text-gray-300">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Registered'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="text-[11px] text-gray-400">Last Profile Update</p>
                <p className="text-xs font-medium text-gray-300">
                  {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                </p>
              </div>
            </div>

            {/* Logout Container */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Active Session</p>
                <p className="text-[11px] text-gray-400">Sign out of nurse clinical workstation</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. Recent Account Activity Section (Audit Log Summary) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-navy-900/80 border border-white/10 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Recent Account Activity
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Certified audit trail for your nurse account. Recorded without patient health information (PHI).
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">
            audit_logs
          </span>
        </div>

        {activityLogs.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-6">No recent account activity recorded.</p>
        ) : (
          <div className="space-y-2">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{log.action}</p>
                    <p className="text-[10px] text-gray-400">{log.dateFormatted} · {log.timeFormatted}</p>
                  </div>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Edit Profile Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-navy-950 border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-left"
            >
              <div className="p-5 bg-navy-900 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-sky-400" />
                  Edit Professional Profile
                </h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                {editErrors.form && (
                  <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                    {editErrors.form}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">First Name *</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                    {editErrors.firstName && (
                      <p className="text-[10px] text-rose-400">{editErrors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-300">Last Name *</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                    {editErrors.lastName && (
                      <p className="text-[10px] text-rose-400">{editErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-300">Contact Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400"
                  />
                  {editErrors.phone && (
                    <p className="text-[10px] text-rose-400">{editErrors.phone}</p>
                  )}
                </div>

                {/* Read-Only Protected Fields Information */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Protected Credentials (Read-Only)
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Nurse ID:</span>
                      <span className="font-mono text-gray-300">{profile?.nurseId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Registration:</span>
                      <span className="font-mono text-gray-300">{profile?.registrationNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Department:</span>
                      <span className="text-gray-300">{profile?.departmentName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Hospital:</span>
                      <span className="text-gray-300">{profile?.hospitalName}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 italic pt-1">
                    Organizational credentials and role assignments cannot be modified by staff. Contact Hospital Administration for changes.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NurseProfilePage;
