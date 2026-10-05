import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Building2,
  Building,
  ShieldCheck,
  Lock,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  Activity,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as hospitalAdminService from '../../services/hospitalAdminService';
import type {
  AdminProfile,
  AdminNotificationPreferences,
  AdminActivityItem,
} from '../../types';

interface AdminProfilePageProps {
  onLogout?: () => void;
}

export const AdminProfilePage: React.FC<AdminProfilePageProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  // ── Authentication Check ──
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
        if (parsed.role && parsed.role !== 'admin') {
          navigate(`/dashboard/${parsed.role}`, { replace: true });
        }
      } catch {
        // ignore
      }
    }
  }, [navigate]);

  // ── State Management ──
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Edit Profile Modal
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editFirstName, setEditFirstName] = useState<string>('');
  const [editLastName, setEditLastName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Security / Change Password
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPw, setShowCurrentPw] = useState<boolean>(false);
  const [showNewPw, setShowNewPw] = useState<boolean>(false);
  const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false);
  const [passwordErrors, setPasswordErrors] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Notification Preferences
  const [preferences, setPreferences] = useState<AdminNotificationPreferences>({
    appointmentAlerts: true,
    staffRosterAlerts: true,
    departmentAlerts: true,
    hospitalPolicyAlerts: true,
    clinicalGuidelineAlerts: true,
    systemMaintenanceAlerts: true,
    reportGenerationAlerts: true,
    emailNotifications: true,
  });
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [prefsSuccess, setPrefsSuccess] = useState<string>('');

  // Activity Log
  const [activities, setActivities] = useState<AdminActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(true);

  // ── Initial Load ──
  const loadProfileData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [profData, prefData, actData] = await Promise.all([
        hospitalAdminService.getAdminProfile(),
        hospitalAdminService.getAdminPreferences().catch(() => ({
          appointmentAlerts: true,
          staffRosterAlerts: true,
          departmentAlerts: true,
          hospitalPolicyAlerts: true,
          clinicalGuidelineAlerts: true,
          systemMaintenanceAlerts: true,
          reportGenerationAlerts: true,
          emailNotifications: true,
        })),
        hospitalAdminService.getAdminActivity(15).catch(() => []),
      ]);

      setProfile(profData);
      setPreferences(prefData);
      setActivities(actData);
    } catch (err: any) {
      console.error('Error loading admin profile:', err);
      setErrorMsg(err.message || 'Unable to retrieve administrator profile.');
    } finally {
      setLoading(false);
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  // ── Open Edit Modal ──
  const handleOpenEdit = () => {
    if (!profile) return;
    setEditFirstName(profile.firstName);
    setEditLastName(profile.lastName);
    setEditPhone(profile.phone || '');
    setEditErrors({});
    setIsEditOpen(true);
  };

  // ── Save Profile Edit ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!editFirstName.trim()) {
      errors.firstName = 'First name is required.';
    }
    if (!editLastName.trim()) {
      errors.lastName = 'Last name is required.';
    }
    if (editPhone.trim()) {
      const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(editPhone.trim())) {
        errors.phone = 'Please provide a valid phone number (e.g. +91 9876543210).';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      setSavingProfile(true);
      setEditErrors({});

      const updated = await hospitalAdminService.updateAdminProfile({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phone: editPhone.trim() || null,
      });

      setProfile(updated);
      setIsEditOpen(false);
      setSuccessMsg('Profile information updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);

      // Refresh activity log
      hospitalAdminService.getAdminActivity(15).then(setActivities).catch(() => {});
    } catch (err: any) {
      setEditErrors({ form: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change Password Handler ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordErrors('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordErrors('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrors('New password and confirmation password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordErrors('New password cannot be identical to your current password.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await hospitalAdminService.changeAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);

      // Refresh activity log
      hospitalAdminService.getAdminActivity(15).then(setActivities).catch(() => {});
    } catch (err: any) {
      setPasswordErrors(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Toggle Preference ──
  const handleTogglePreference = async (key: keyof AdminNotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);

    try {
      setSavingPrefs(true);
      await hospitalAdminService.updateAdminPreferences({ [key]: updated[key] });
      setPrefsSuccess('Notification preferences saved.');
      setTimeout(() => setPrefsSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save preference:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Logout ──
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to end your administrator session?')) {
      await hospitalAdminService.adminLogout();
      if (onLogout) {
        onLogout();
      } else {
        navigate('/login', { replace: true });
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6 border border-white/10 rounded-2xl animate-pulse flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-white/20 rounded" />
            <div className="h-4 w-32 bg-white/10 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-white/10 animate-pulse h-64" />
          <div className="glass-card p-6 rounded-2xl border border-white/10 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h3 className="text-base font-bold text-white">Administrator Profile Unavailable</h3>
          <p className="text-xs text-rose-300">{errorMsg}</p>
          <Button variant="primary" size="sm" onClick={() => loadProfileData()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Global Alerts ── */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Profile Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 border border-accent/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90 rounded-3xl shadow-xl"
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl shadow-glow-primary border border-white/20">
                {profile.firstName.charAt(0)}
                {profile.lastName.charAt(0)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-navy-950 flex items-center justify-center" title="Active Account">
                <Check className="w-3 h-3 text-white" />
              </span>
            </div>

            {/* Title & Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/40">
                  {profile.designation}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Status: Active Account
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {profile.fullName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                <Building className="w-4 h-4 text-accent" />
                {profile.hospital ? profile.hospital.name : 'Hospital Administration'}
                {profile.hospital?.city ? ` • ${profile.hospital.city}, ${profile.hospital.state}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={handleOpenEdit}
            >
              Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<LogOut className="w-4 h-4 text-rose-400" />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── 2 & 3. Information Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6 border border-white/10 rounded-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              Administrator Information
            </h2>
            <button
              onClick={handleOpenEdit}
              className="text-xs text-accent hover:text-accent-hover font-semibold flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400 font-medium">First Name:</span>
              <span className="font-semibold text-white">{profile.firstName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-gray-400 font-medium">Last Name:</span>
              <span className="font-semibold text-white">{profile.lastName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-gray-400 font-medium">Email Address:</span>
              <span className="font-mono text-cyan-300 font-semibold">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-gray-400 font-medium">Contact Phone:</span>
              <span className="font-mono text-white">
                {profile.phone || <span className="text-gray-500 italic">Not provided</span>}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-gray-400 font-medium">Administrator ID:</span>
              <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                ADM-{String(profile.adminId).padStart(4, '0')}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-gray-400 font-medium">System User ID:</span>
              <span className="font-mono text-gray-300">UID-{profile.userId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-gray-400 font-medium">Role Assignment:</span>
              <span className="font-semibold text-cyan-400 capitalize">{profile.role} (Role #{profile.roleId})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5">
              <span className="text-gray-400 font-medium">Registered Since:</span>
              <span className="text-gray-300 font-mono">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Hospital Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 border border-white/10 rounded-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Hospital Information
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              Authorized Scope
            </span>
          </div>

          {profile.hospital ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-medium">Hospital Name:</span>
                <span className="font-bold text-white text-right">{profile.hospital.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-gray-400 font-medium">Hospital ID:</span>
                <span className="font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  HOSP-{String(profile.hospital.id).padStart(3, '0')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-gray-400 font-medium">Address:</span>
                <span className="text-gray-200 text-right">
                  {profile.hospital.address || <span className="text-gray-500 italic">Central Medical Complex</span>}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-gray-400 font-medium">Location:</span>
                <span className="text-gray-200">
                  {profile.hospital.city ? `${profile.hospital.city}, ${profile.hospital.state}` : 'Kochi, Kerala'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-gray-400 font-medium">Hospital Helpline:</span>
                <span className="font-mono text-cyan-300">
                  {profile.hospital.phone || '+91 484 288 9000'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-white/5">
                <span className="text-gray-400 font-medium">Official Email:</span>
                <span className="font-mono text-gray-300">
                  {profile.hospital.email || 'info@meditwin-hospital.org'}
                </span>
              </div>
              <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Hospital scope is enforced server-side. Modification requires System Administrator authority.</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">
              No hospital record linked to this account.
            </div>
          )}
        </motion.div>
      </div>

      {/* ── 4 & 5. Security & Notification Preferences ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security / Password Change */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6 border border-white/10 rounded-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              Security & Password
            </h2>
            <span className="text-[10px] text-gray-400 font-mono">bcrypt (Cost 12)</span>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            {passwordErrors && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{passwordErrors}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-gray-400 font-medium mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-3 py-2 text-white pr-9 focus:outline-none focus:border-accent text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-gray-400 font-medium mb-1">New Password (min 8 chars)</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-3 py-2 text-white pr-9 focus:outline-none focus:border-accent text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-gray-400 font-medium mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-navy-950/80 border border-white/10 rounded-xl px-3 py-2 text-white pr-9 focus:outline-none focus:border-accent text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<KeyRound className="w-4 h-4" />}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full justify-center"
            >
              {changingPassword ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </motion.div>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 border border-white/10 rounded-2xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-400" />
              Notification Preferences
            </h2>
            {savingPrefs && <span className="text-[10px] text-cyan-400 animate-pulse font-mono">Saving...</span>}
            {prefsSuccess && <span className="text-[10px] text-emerald-400 font-semibold">{prefsSuccess}</span>}
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                key: 'appointmentAlerts' as const,
                label: 'Appointment & Volume Alerts',
                desc: 'Alerts for hospital appointment bookings and cancellations',
              },
              {
                key: 'staffRosterAlerts' as const,
                label: 'Staff Roster Updates',
                desc: 'Notifications regarding physician and nursing shift assignments',
              },
              {
                key: 'departmentAlerts' as const,
                label: 'Department Capacity Alerts',
                desc: 'Operational notifications when departmental load exceeds 85%',
              },
              {
                key: 'hospitalPolicyAlerts' as const,
                label: 'Hospital Policy Updates',
                desc: 'Immediate announcements regarding administrative protocol revisions',
              },
              {
                key: 'clinicalGuidelineAlerts' as const,
                label: 'Clinical Guideline Alerts',
                desc: 'Notifications when clinical procedures or SOPs are published',
              },
              {
                key: 'systemMaintenanceAlerts' as const,
                label: 'Infrastructure Maintenance',
                desc: 'Notifications for electrical, HVAC, and power backup maintenance',
              },
              {
                key: 'reportGenerationAlerts' as const,
                label: 'Administrative Census Reports',
                desc: 'Alerts when scheduled monthly and quarterly reports are ready',
              },
              {
                key: 'emailNotifications' as const,
                label: 'Executive Email Digest',
                desc: 'Weekly summary digest delivered directly to administrator email',
              },
            ].map((item) => (
              <div
                key={item.key}
                onClick={() => handleTogglePreference(item.key)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="space-y-0.5 pr-3">
                  <div className="font-semibold text-white">{item.label}</div>
                  <div className="text-[11px] text-gray-400">{item.desc}</div>
                </div>
                <div
                  className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    preferences[item.key] ? 'bg-accent' : 'bg-white/10'
                  }`}
                >
                  <motion.div
                    layout
                    className={`w-3.5 h-3.5 rounded-full bg-white shadow-md ${
                      preferences[item.key] ? 'ml-auto' : ''
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── 6. Administrative Activity Stream ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card p-6 border border-white/10 rounded-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Recent Account Activity</h2>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {activities.length} Recorded Events
          </span>
        </div>

        {loadingActivities ? (
          <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
            Loading recent administrative activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No recent administrative activity.
          </div>
        ) : (
          <div className="divide-y divide-white/5 text-xs">
            {activities.map((act) => (
              <div key={act.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-cyan-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{act.action}</div>
                    <div className="text-[11px] text-gray-400 font-mono">Table: {act.table}</div>
                  </div>
                </div>
                <div className="text-right sm:text-right text-gray-400 font-mono text-[11px] pl-11 sm:pl-0">
                  <div>{act.dateFormatted}</div>
                  <div className="text-gray-500">{act.timeFormatted}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── 8. Session & Logout ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6 border border-rose-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-950/20 via-navy-900/60 to-navy-900/40"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <LogOut className="w-4 h-4" />
            <h3>Administrative Session Management</h3>
          </div>
          <p className="text-xs text-gray-400 max-w-xl">
            Securely invalidate your current active session token and audit log your sign-out event.
            Ensure all pending changes are saved before terminating your session.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          icon={<LogOut className="w-4 h-4 text-rose-400" />}
          className="border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 text-rose-300 flex-shrink-0"
        >
          Sign Out of Administrator Console
        </Button>
      </motion.div>

      {/* ── Edit Profile Modal ── */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 border border-white/20 rounded-3xl shadow-2xl space-y-5 bg-navy-900"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-cyan-400" />
                  Edit Administrator Profile
                </h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                {editErrors.form && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {editErrors.form}
                  </div>
                )}

                {/* First Name */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    First Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-navy-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent text-xs"
                  />
                  {editErrors.firstName && (
                    <span className="text-rose-400 text-[11px] mt-1 block">{editErrors.firstName}</span>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Last Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-navy-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent text-xs"
                  />
                  {editErrors.lastName && (
                    <span className="text-rose-400 text-[11px] mt-1 block">{editErrors.lastName}</span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-navy-950 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-accent text-xs"
                  />
                  {editErrors.phone && (
                    <span className="text-rose-400 text-[11px] mt-1 block">{editErrors.phone}</span>
                  )}
                </div>

                {/* Read-only indicators for protected fields */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-[11px] text-gray-400">
                  <div className="font-semibold text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Protected Administrative Fields (Read-Only)
                  </div>
                  <div>• Email: {profile.email}</div>
                  <div>• Role: {profile.role} (Cannot be altered via profile)</div>
                  <div>• Hospital: {profile.hospital?.name} (Scope bound)</div>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => setIsEditOpen(false)}
                    disabled={savingProfile}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={<Save className="w-4 h-4" />}
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProfilePage;
