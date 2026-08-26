import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Heart,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Pill,
  Syringe,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  RefreshCw,
  Stethoscope,
  Building2,
  Calendar,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as patientService from '../../services/patientService';
import type { PatientHealthProfile } from '../../types';
import { getTallManName } from '../../utils/medicationSafety';

export const HealthProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<PatientHealthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editing Contact & Emergency Info
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: '',
    email: '',
    address: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await patientService.getPatientProfile();
      setProfile(data);
      const cleanPhone = (data.phone || '').replace(/\D/g, '').slice(-10);
      const cleanEmergPhone = (data.emergencyContact?.phone || '').replace(/\D/g, '').slice(-10);
      setEditForm({
        phone: cleanPhone || data.phone,
        email: data.email || '',
        address: data.address || '',
        emergencyName: data.emergencyContact?.name || '',
        emergencyRelationship: data.emergencyContact?.relationship || 'Spouse',
        emergencyPhone: cleanEmergPhone || data.emergencyContact?.phone || '',
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load your health profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Phone Number: exactly 10 digits
    const cleanPhone = editForm.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Phone number is required.';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Phone number must consist of exactly 10 digits.';
    }

    // 2. Email Address
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!editForm.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(editForm.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // 3. Residential Address
    if (!editForm.address.trim()) {
      errors.address = 'Residential address is required.';
    } else if (editForm.address.trim().length < 5) {
      errors.address = 'Residential address must be at least 5 characters long.';
    }

    // 4. Emergency Contact Name: alphabetic only, min 2 chars
    const nameRegex = /^[a-zA-Z\s.]{2,50}$/;
    if (!editForm.emergencyName.trim()) {
      errors.emergencyName = 'Emergency contact name is required.';
    } else if (!nameRegex.test(editForm.emergencyName.trim())) {
      errors.emergencyName = 'Emergency contact name must contain only letters (at least 2 characters).';
    }

    // 5. Relationship: must be chosen
    if (!editForm.emergencyRelationship.trim()) {
      errors.emergencyRelationship = 'Please select a relationship.';
    }

    // 6. Emergency Contact Phone: exactly 10 digits
    const cleanEmergPhone = editForm.emergencyPhone.replace(/\D/g, '');
    if (!cleanEmergPhone) {
      errors.emergencyPhone = 'Emergency contact phone number is required.';
    } else if (cleanEmergPhone.length !== 10) {
      errors.emergencyPhone = 'Emergency phone number must consist of exactly 10 digits.';
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !validateEditForm()) return;

    setSaving(true);
    try {
      const cleanPhone = editForm.phone.replace(/\D/g, '');
      const cleanEmergPhone = editForm.emergencyPhone.replace(/\D/g, '');
      const updated = await patientService.updatePatientContactInfo(profile.id, {
        phone: cleanPhone,
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        emergencyContact: {
          name: editForm.emergencyName.trim(),
          relationship: editForm.emergencyRelationship.trim() || 'Spouse',
          phone: cleanEmergPhone,
        },
      });

      setProfile(updated);
      setIsEditing(false);
      setSuccessMsg('Personal and emergency contact information updated successfully.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update contact details.');
    } finally {
      setSaving(false);
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-glow-primary flex-shrink-0">
              {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : <User className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  {profile?.patientId || 'Patient Record'}
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Verified Patient
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {profile ? `${profile.firstName} ${profile.lastName}` : 'My Health Profile'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300">
                {profile
                  ? `Age: ${profile.age} Yrs • Blood Group: ${profile.bloodGroup} • Gender: ${profile.gender}`
                  : 'Your personal and clinical health summary'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="primary"
                size="sm"
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => setIsEditing(true)}
              >
                Edit Contact Info
              </Button>
            )}
            <Button variant="glass" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={loadProfile}>
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

      {loading ? (
        <div className="glass-card border border-white/10 p-20 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading your medical information...</p>
        </div>
      ) : !profile ? (
        <div className="glass-card border border-white/10 p-16 text-center">
          <p className="text-white font-bold">Unable to load patient information.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Personal & Emergency Info (Editable Form or Display) ── */}
          <div className="glass-card p-6 border border-white/10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                <h3 className="text-base font-bold text-white">Personal & Emergency Contact Details</h3>
              </div>
              {isEditing ? (
                <span className="text-xs text-amber-400 font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  Editing Mode
                </span>
              ) : (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Records
                </span>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveContactInfo} noValidate className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phone Number */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Phone Number (10 Digits) <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">{editForm.phone.length}/10</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editForm.phone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditForm((p) => ({ ...p, phone: digits }));
                        }}
                        placeholder="9876543210"
                        className={`w-full py-2.5 pl-12 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 font-mono ${
                          editErrors.phone ? 'border-rose-500/60 focus:border-rose-500' : 'border-white/15 focus:border-accent/60'
                        }`}
                      />
                    </div>
                    {editErrors.phone && <p className="text-rose-400 text-xs mt-1">{editErrors.phone}</p>}
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="patient@example.com"
                      className={`w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 ${
                        editErrors.email ? 'border-rose-500/60 focus:border-rose-500' : 'border-white/15 focus:border-accent/60'
                      }`}
                    />
                    {editErrors.email && <p className="text-rose-400 text-xs mt-1">{editErrors.email}</p>}
                  </div>

                  {/* Residential Address */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Residential Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Street address, apartment, locality, city, state, postal code"
                      className={`w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 ${
                        editErrors.address ? 'border-rose-500/60 focus:border-rose-500' : 'border-white/15 focus:border-accent/60'
                      }`}
                    />
                    {editErrors.address && <p className="text-rose-400 text-xs mt-1">{editErrors.address}</p>}
                  </div>

                  {/* Emergency Contact Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Emergency Contact Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.emergencyName}
                      onChange={(e) => setEditForm((p) => ({ ...p, emergencyName: e.target.value }))}
                      placeholder="Full Name (e.g. Neha Mehta)"
                      className={`w-full py-2.5 px-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 ${
                        editErrors.emergencyName ? 'border-rose-500/60 focus:border-rose-500' : 'border-white/15 focus:border-accent/60'
                      }`}
                    />
                    {editErrors.emergencyName && <p className="text-rose-400 text-xs mt-1">{editErrors.emergencyName}</p>}
                  </div>

                  {/* Relationship Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Relationship <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={editForm.emergencyRelationship}
                      onChange={(e) => setEditForm((p) => ({ ...p, emergencyRelationship: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-sm text-white bg-[#0F172A] border rounded-xl focus:outline-none focus:border-accent/60 cursor-pointer ${
                        editErrors.emergencyRelationship ? 'border-rose-500/60 focus:border-rose-500' : 'border-white/15'
                      }`}
                    >
                      <option value="" disabled className="bg-[#0F172A] text-gray-400">— Select Relationship —</option>
                      <option value="Spouse" className="bg-[#0F172A] text-white">Spouse</option>
                      <option value="Parent" className="bg-[#0F172A] text-white">Parent</option>
                      <option value="Mother" className="bg-[#0F172A] text-white">Mother</option>
                      <option value="Father" className="bg-[#0F172A] text-white">Father</option>
                      <option value="Child" className="bg-[#0F172A] text-white">Child</option>
                      <option value="Son" className="bg-[#0F172A] text-white">Son</option>
                      <option value="Daughter" className="bg-[#0F172A] text-white">Daughter</option>
                      <option value="Sibling" className="bg-[#0F172A] text-white">Sibling</option>
                      <option value="Brother" className="bg-[#0F172A] text-white">Brother</option>
                      <option value="Sister" className="bg-[#0F172A] text-white">Sister</option>
                      <option value="Guardian" className="bg-[#0F172A] text-white">Guardian</option>
                      <option value="Friend" className="bg-[#0F172A] text-white">Friend</option>
                      <option value="Relative" className="bg-[#0F172A] text-white">Relative</option>
                      <option value="Other" className="bg-[#0F172A] text-white">Other</option>
                    </select>
                    {editErrors.emergencyRelationship && <p className="text-rose-400 text-xs mt-1">{editErrors.emergencyRelationship}</p>}
                  </div>

                  {/* Emergency Contact Phone Number */}
                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Emergency Contact Phone Number (10 Digits) <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">{editForm.emergencyPhone.length}/10</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={editForm.emergencyPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditForm((p) => ({ ...p, emergencyPhone: digits }));
                        }}
                        placeholder="9876500001"
                        className={`w-full py-2.5 pl-12 pr-3 text-sm text-white bg-white/5 border rounded-xl focus:outline-none focus:ring-1 font-mono ${
                          editErrors.emergencyPhone ? 'border-rose-500/60 focus:border-rose-500' : 'border-white/15 focus:border-accent/60'
                        }`}
                      />
                    </div>
                    {editErrors.emergencyPhone && <p className="text-rose-400 text-xs mt-1">{editErrors.emergencyPhone}</p>}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={saving}
                    icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  >
                    {saving ? 'Saving...' : 'Save Contact Details'}
                  </Button>
                  <Button
                    type="button"
                    variant="glass"
                    size="md"
                    onClick={() => {
                      setIsEditing(false);
                      setEditErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-white/5 rounded-xl p-3.5 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Patient Record ID</span>
                  <p className="text-sm font-bold text-accent">{profile.patientId}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Date of Birth</span>
                  <p className="text-sm font-bold text-white">{profile.dateOfBirth}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Phone Number</span>
                  <p className="text-sm font-bold text-white">{profile.phone}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3.5 space-y-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Email Address</span>
                  <p className="text-sm font-bold text-white truncate">{profile.email}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 space-y-1 sm:col-span-2">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Residential Address</span>
                  <p className="text-xs font-semibold text-white">{profile.address}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-3.5 space-y-1 sm:col-span-2 border border-accent/20">
                  <span className="text-accent font-bold uppercase text-[10px]">Primary Emergency Contact</span>
                  <p className="text-xs font-bold text-white">
                    {profile.emergencyContact.name} ({profile.emergencyContact.relationship}) —{' '}
                    <span className="text-accent">{profile.emergencyContact.phone}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Clinical Health Summary (Protected & Read-Only) ── */}
          <div className="glass-card p-6 border border-white/10 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                <h3 className="text-base font-bold text-white">Medical Summary (Clinical Records)</h3>
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <Lock className="w-3.5 h-3.5 text-accent" /> Physician Authored Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Allergies */}
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Allergies & Contraindications
                  </span>
                  <span className="text-[10px] text-rose-400 font-bold px-2 py-0.5 rounded-full bg-rose-500/20">
                    High Alert
                  </span>
                </div>
                <div className="space-y-2">
                  {profile.medicalSummary.allergies.map((a, idx) => {
                    const isVerified = a.verificationStatus?.startsWith('Verified');
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-black/20 border border-rose-500/20 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white">{a.substance}</p>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                isVerified
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {a.verificationStatus || 'Self-Reported (Unverified)'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/30 text-rose-200">
                            {a.severity}
                          </span>
                        </div>
                        <p className="text-gray-300 text-[11px]">
                          {a.reaction}
                          {a.reactionType && <span className="text-gray-400 ml-1">· {a.reactionType}</span>}
                        </p>
                        {a.verifiedBy && (
                          <p className="text-[10px] text-gray-400">
                            Verified by: <span className="text-gray-200">{a.verifiedBy}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chronic Conditions */}
              <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-sky-400" /> Chronic Health Conditions
                  </span>
                </div>
                <div className="space-y-2">
                  {profile.medicalSummary.chronicConditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-black/20 border border-sky-500/20 text-xs text-white font-medium flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <span>{cond}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Active Medications */}
              <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-4 md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
                  <div>
                    <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-purple-400" /> Current Prescribed Medications
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Official prescriptions authorized by your licensed attending hospital physicians.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {profile.medicalSummary.currentMedications.length} Active Prescriptions
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {profile.medicalSummary.currentMedications.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-black/30 border border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-2.5 text-xs shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-extrabold text-white text-sm block font-mono">{getTallManName(m.name)}</span>
                          <span className="text-purple-300 text-xs font-medium">{m.frequency}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 font-bold text-xs">
                          {m.dosage}
                        </span>
                      </div>

                      {/* Prescribing Doctor Information Banner */}
                      <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/15 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-gray-300">
                          <Stethoscope className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                          <span>Prescribed by: <strong className="text-white font-semibold">{m.prescribedBy}</strong></span>
                        </div>
                        {m.startDate && (
                          <span className="text-gray-400 text-[10px] hidden sm:inline">
                            Since {m.startDate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immunization & Vaccination History */}
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4 md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Syringe className="w-4 h-4 text-emerald-400" /> Immunization & Vaccine Registry
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Verified records documented by certified clinics, health centers, and immunization registries.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Official Health Registry
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {profile.medicalSummary.vaccinationStatus.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-black/30 border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2.5 text-xs shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-extrabold text-white text-sm">{v.vaccine}</p>
                          <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>Facility: <strong className="text-gray-200">{v.provider}</strong></span>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            v.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {v.status === 'Completed' ? '✓ Completed' : '⏱ Booster Due'}
                        </span>
                      </div>

                      {/* Date, Batch & Verification Details */}
                      <div className="space-y-1.5 pt-1.5 border-t border-white/5 text-[11px] text-gray-400">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{v.status === 'Completed' ? `Administered: ${v.date}` : `Scheduled Date: ${v.date}`}</span>
                          </div>
                          {v.batchNumber && (
                            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              Batch: {v.batchNumber}
                            </span>
                          )}
                        </div>

                        {(v.verificationStatus || v.verificationSource) && (
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] pt-1 border-t border-white/5">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> {v.verificationStatus || 'Clinically Verified'}
                            </span>
                            {v.verificationSource && (
                              <span className="text-gray-400 truncate max-w-[260px] italic">
                                {v.verificationSource}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthProfilePage;
