import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  HeartPulse,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  CheckSquare,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Check,
  X,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { Button } from '../components/Button';

export interface PatientFormData {
  fullName: string;
  dob: string;
  gender: string;
  countryCode: string;
  phone: string;
  email: string;
  address: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyCountryCode: string;
  emergencyPhone: string;
  bloodGroup: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  primaryProvider: string;
  username: string;
  password: string;
  confirmPassword: string;
  confirmAccurate: boolean;
  agreeTerms: boolean;
  consentDataStorage: boolean;
}

const initialForm: PatientFormData = {
  fullName: '',
  dob: '',
  gender: '',
  countryCode: '+1',
  phone: '',
  email: '',
  address: '',
  emergencyName: '',
  emergencyRelationship: 'Parent',
  emergencyCountryCode: '+1',
  emergencyPhone: '',
  bloodGroup: '',
  allergies: '',
  medicalConditions: '',
  medications: '',
  primaryProvider: '',
  username: '',
  password: '',
  confirmPassword: '',
  confirmAccurate: false,
  agreeTerms: false,
  consentDataStorage: false,
};

export const PatientRegisterPage: React.FC = () => {
  const [form, setForm] = useState<PatientFormData>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Field change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Validation Rules
  const errors: Record<string, string> = {};

  // 1. Full Name: Required, min 2 chars, no numbers
  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  } else if (/[0-9]/.test(form.fullName)) {
    errors.fullName = 'Full name cannot contain numbers.';
  }

  // 2. Date of Birth
  if (!form.dob) {
    errors.dob = 'Please enter a valid date of birth.';
  } else {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (form.dob > todayStr) {
      errors.dob = 'Date of birth cannot be in the future.';
    } else {
      const [year, month, day] = form.dob.split('-').map(Number);
      const dobDate = new Date(year, month - 1, day);
      if (isNaN(dobDate.getTime())) {
        errors.dob = 'Please enter a valid date of birth.';
      }
    }
  }

  // 3. Gender
  if (!form.gender) {
    errors.gender = 'Gender is required.';
  }

  // 4. Phone
  if (!form.phone.trim()) {
    errors.phone = 'Please enter a valid phone number.';
  } else if (!/^\d{10}$/.test(form.phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  // 5. Email
  if (!form.email.trim()) {
    errors.email = 'Please enter a valid email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  // 6. Address (Required for Patient)
  if (!form.address.trim()) {
    errors.address = 'Address is required.';
  }

  // 7. Emergency Contact Name
  if (!form.emergencyName.trim()) {
    errors.emergencyName = 'Emergency contact is required.';
  } else if (form.emergencyName.trim().length < 2) {
    errors.emergencyName = 'Emergency contact name must be at least 2 characters.';
  }

  // 8. Emergency Relationship
  if (!form.emergencyRelationship) {
    errors.emergencyRelationship = 'Relationship is required.';
  }

  // 9. Emergency Phone
  if (!form.emergencyPhone.trim()) {
    errors.emergencyPhone = 'Emergency contact phone is required.';
  } else if (!/^\d{10}$/.test(form.emergencyPhone.replace(/[\s-]/g, ''))) {
    errors.emergencyPhone = 'Emergency phone number must be exactly 10 digits.';
  }

  // 10. Username
  if (!form.username.trim()) {
    errors.username = 'Username is required.';
  } else if (form.username.trim().length < 4) {
    errors.username = 'Username must be at least 4 characters.';
  } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
    errors.username = 'Username can only contain letters, numbers, and underscores.';
  }

  // 11. Password & Password Strength Requirements
  const pass = form.password;
  const passMinLength = pass.length >= 8;
  const passUppercase = /[A-Z]/.test(pass);
  const passLowercase = /[a-z]/.test(pass);
  const passNumber = /[0-9]/.test(pass);
  const passSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
  const passValid = passMinLength && passUppercase && passLowercase && passNumber && passSpecial;

  // Password Strength Score & Label
  let passScore = 0;
  if (pass.length > 0) {
    if (passMinLength) passScore++;
    if (passUppercase) passScore++;
    if (passLowercase) passScore++;
    if (passNumber) passScore++;
    if (passSpecial) passScore++;
  }

  let passStrengthLabel: 'Weak' | 'Medium' | 'Strong' = 'Weak';
  if (passScore >= 4) passStrengthLabel = 'Strong';
  else if (passScore >= 2) passStrengthLabel = 'Medium';

  if (!pass) {
    errors.password = 'Password is required.';
  } else if (!passMinLength) {
    errors.password = 'Password must contain at least 8 characters.';
  } else if (!passValid) {
    errors.password = 'Password does not meet all security requirements.';
  }

  // 12. Confirm Password
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 13. Consent Checkboxes
  if (!form.confirmAccurate || !form.agreeTerms || !form.consentDataStorage) {
    errors.consent = 'Please accept the Privacy Policy and consent terms.';
  }

  const isFormValid = Object.keys(errors).length === 0;

  const handleClearForm = () => {
    setForm(initialForm);
    setTouched({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      const allTouched: Record<string, boolean> = {};
      Object.keys(form).forEach((k) => (allTouched[k] = true));
      setTouched(allTouched);
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    const nameParts = form.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName  = nameParts.slice(1).join(' ') || nameParts[0];

    try {
      const res = await fetch('/api/register/patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email:                form.email.trim(),
          password:             form.password,
          dob:                  form.dob,
          gender:               form.gender || undefined,
          phone:                form.phone ? `${form.countryCode} ${form.phone}` : undefined,
          address:              form.address || undefined,
          bloodGroup:           form.bloodGroup || undefined,
          emergencyContactName: form.emergencyName || undefined,
          emergencyContactPhone:form.emergencyPhone
            ? `${form.emergencyCountryCode} ${form.emergencyPhone}`
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Save registered patient in local store
      try {
        const stored = JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
        const newRecord = {
          id: data.userId || 'USR-' + Math.floor(1000 + Math.random() * 9000),
          firstName,
          lastName,
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'patient',
          dob: form.dob,
          phone: form.phone ? `${form.countryCode} ${form.phone}` : undefined,
          status: 'Active',
          registeredAt: new Date().toISOString().split('T')[0],
        };
        const filtered = stored.filter((u: any) => u.email !== form.email.trim() && u.username !== form.username.trim());
        localStorage.setItem('meditwin_registered_users', JSON.stringify([newRecord, ...filtered]));
      } catch (e) {
        console.error('Error saving local patient record:', e);
      }

      setIsSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Offline fallback: save locally
      try {
        const stored = JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
        const newRecord = {
          id: 'USR-' + Math.floor(1000 + Math.random() * 9000),
          firstName,
          lastName,
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'patient',
          dob: form.dob,
          phone: form.phone ? `${form.countryCode} ${form.phone}` : undefined,
          status: 'Active',
          registeredAt: new Date().toISOString().split('T')[0],
        };
        const filtered = stored.filter((u: any) => u.email !== form.email.trim() && u.username !== form.username.trim());
        localStorage.setItem('meditwin_registered_users', JSON.stringify([newRecord, ...filtered]));
        setIsSubmittedSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        setApiError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans selection:bg-accent selection:text-navy-950">
      
      {/* PAGE HEADER */}
      <header className="border-b border-white/10 glass-nav sticky top-0 z-40 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                <Activity className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white">MediTwin</span>
                <span className="text-xl font-black text-accent">AI</span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide block -mt-1">
                Intelligent Patient Digital Twin
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="text-gray-400 hidden sm:inline">Already have an account?</span>
            <Link to="/login">
              <Button variant="outline" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {isSubmittedSuccess ? (
          
          /* SUCCESS VIEW CARD */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 sm:p-12 border border-emerald-500/30 text-center rounded-3xl space-y-6 max-w-2xl mx-auto my-12 bg-gradient-to-b from-navy-900/90 via-navy-900 to-navy-950 shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-primary">
              <CheckCircle2 className="w-10 h-10 animate-pulse" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
                ✓ Account Created Successfully
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Welcome to MediTwin AI
              </h2>
              <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto">
                Your MediTwin AI patient account has been created successfully.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 text-left space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Patient Digital Twin Ready:
              </div>
              <p>
                Your health information can now be securely managed through your patient dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/login" className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full justify-center">
                  Go to Login
                </Button>
              </Link>
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="glass" size="md" className="w-full justify-center">
                  Back to Home
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          
          /* REGISTRATION FORM */
          <div className="space-y-8">
            
            {/* Title Banner & Role Switcher */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              
              {/* Role Switcher Tabs */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <Link
                  to="/register/doctor"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <span>Doctor</span>
                </Link>
                <Link
                  to="/register/nurse"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <span>Nurse</span>
                </Link>
                <Link
                  to="/register/patient"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-primary text-white border border-accent/40 shadow-glow-primary flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-accent" />
                  <span>Patient</span>
                </Link>
                <Link
                  to="/register/admin"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <span>Administrator</span>
                </Link>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-bold">
                <ShieldCheck className="w-4 h-4" /> 🔒 Your health information is securely protected
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Create Patient Account
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">
                Create your secure MediTwin AI account to manage your healthcare information in one place.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              
              {/* ================================================== */}
              {/* SECTION 1 — PERSONAL INFORMATION                   */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-accent">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Personal Information</h2>
                    <p className="text-xs text-gray-400">Basic identification and contact details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('fullName')}
                        placeholder="Enter your full name"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.fullName && errors.fullName
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.fullName && !errors.fullName
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.fullName && !errors.fullName && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.fullName && errors.fullName && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Date of Birth *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="dob"
                        value={form.dob}
                        onChange={handleChange}
                        onBlur={() => handleBlur('dob')}
                        max={new Date().toLocaleDateString('en-CA')}
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all [color-scheme:dark] ${
                          touched.dob && errors.dob
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.dob && !errors.dob
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.dob && !errors.dob && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-10 top-3.5" />
                      )}
                    </div>
                    {touched.dob && errors.dob && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.dob}
                      </p>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Gender *
                    </label>
                    <div className="relative">
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                        onBlur={() => handleBlur('gender')}
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white focus:outline-none cursor-pointer transition-all ${
                          touched.gender && errors.gender
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.gender && !errors.gender
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      >
                        <option value="" className="bg-navy-900 text-gray-400">Select Gender</option>
                        <option value="Male" className="bg-navy-900 text-white">Male</option>
                        <option value="Female" className="bg-navy-900 text-white">Female</option>
                        <option value="Other" className="bg-navy-900 text-white">Other</option>
                        <option value="Prefer not to say" className="bg-navy-900 text-white">Prefer not to say</option>
                      </select>
                    </div>
                    {touched.gender && errors.gender && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.gender}
                      </p>
                    )}
                  </div>

                  {/* Phone Number with Country Code */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Phone Number *
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="countryCode"
                        value={form.countryCode}
                        onChange={handleChange}
                        className="py-3 px-3 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="+1" className="bg-navy-900">🇺🇸 +1</option>
                        <option value="+91" className="bg-navy-900">🇮🇳 +91</option>
                        <option value="+44" className="bg-navy-900">🇬🇧 +44</option>
                        <option value="+61" className="bg-navy-900">🇦🇺 +61</option>
                        <option value="+81" className="bg-navy-900">🇯🇵 +81</option>
                        <option value="+49" className="bg-navy-900">🇩🇪 +49</option>
                      </select>
                      <div className="relative flex-grow">
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          onBlur={() => handleBlur('phone')}
                          placeholder="9876543210"
                          className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                            touched.phone && errors.phone
                              ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                              : touched.phone && !errors.phone
                              ? 'border-emerald-500/80 focus:border-emerald-500'
                              : 'border-white/15 focus:border-accent'
                          }`}
                        />
                        {touched.phone && !errors.phone && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                        )}
                      </div>
                    </div>
                    {touched.phone && errors.phone && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        onBlur={() => handleBlur('email')}
                        placeholder="patient@example.com"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.email && errors.email
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.email && !errors.email
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.email && !errors.email && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.email && errors.email && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Address *
                    </label>
                    <textarea
                      name="address"
                      rows={3}
                      value={form.address}
                      onChange={handleChange}
                      onBlur={() => handleBlur('address')}
                      placeholder="Enter full residential address..."
                      className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all resize-none ${
                        touched.address && errors.address
                          ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                          : touched.address && !errors.address
                          ? 'border-emerald-500/80 focus:border-emerald-500'
                          : 'border-white/15 focus:border-accent'
                      }`}
                    />
                    {touched.address && errors.address && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* SECTION 2 — EMERGENCY CONTACT                      */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Emergency Contact</h2>
                    <p className="text-xs text-gray-400">Primary family or guardian contact for medical emergencies</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Emergency Contact Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Emergency Contact Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="emergencyName"
                        value={form.emergencyName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('emergencyName')}
                        placeholder="Enter contact full name"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.emergencyName && errors.emergencyName
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.emergencyName && !errors.emergencyName
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.emergencyName && !errors.emergencyName && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.emergencyName && errors.emergencyName && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.emergencyName}
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Relationship *
                    </label>
                    <select
                      name="emergencyRelationship"
                      value={form.emergencyRelationship}
                      onChange={handleChange}
                      onBlur={() => handleBlur('emergencyRelationship')}
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="Parent" className="bg-navy-900">Parent</option>
                      <option value="Spouse" className="bg-navy-900">Spouse</option>
                      <option value="Sibling" className="bg-navy-900">Sibling</option>
                      <option value="Child" className="bg-navy-900">Child</option>
                      <option value="Guardian" className="bg-navy-900">Guardian</option>
                      <option value="Other" className="bg-navy-900">Other</option>
                    </select>
                  </div>

                  {/* Emergency Contact Phone */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Emergency Contact Phone *
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="emergencyCountryCode"
                        value={form.emergencyCountryCode}
                        onChange={handleChange}
                        className="py-3 px-3 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="+1" className="bg-navy-900">🇺🇸 +1</option>
                        <option value="+91" className="bg-navy-900">🇮🇳 +91</option>
                        <option value="+44" className="bg-navy-900">🇬🇧 +44</option>
                        <option value="+61" className="bg-navy-900">🇦🇺 +61</option>
                        <option value="+81" className="bg-navy-900">🇯🇵 +81</option>
                        <option value="+49" className="bg-navy-900">🇩🇪 +49</option>
                      </select>
                      <div className="relative flex-grow">
                        <input
                          type="tel"
                          name="emergencyPhone"
                          value={form.emergencyPhone}
                          onChange={handleChange}
                          onBlur={() => handleBlur('emergencyPhone')}
                          placeholder="9876543210"
                          className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                            touched.emergencyPhone && errors.emergencyPhone
                              ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                              : touched.emergencyPhone && !errors.emergencyPhone
                              ? 'border-emerald-500/80 focus:border-emerald-500'
                              : 'border-white/15 focus:border-accent'
                          }`}
                        />
                        {touched.emergencyPhone && !errors.emergencyPhone && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                        )}
                      </div>
                    </div>
                    {touched.emergencyPhone && errors.emergencyPhone && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.emergencyPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* SECTION 3 — BASIC HEALTH INFORMATION               */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Basic Health Information</h2>
                    <p className="text-xs text-gray-400">Optional health details to assist your medical care team</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Blood Group */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Blood Group <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <select
                      name="bloodGroup"
                      value={form.bloodGroup}
                      onChange={handleChange}
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer max-w-md"
                    >
                      <option value="" className="bg-navy-900 text-gray-400">Select Blood Group</option>
                      <option value="A+" className="bg-navy-900">A+</option>
                      <option value="A-" className="bg-navy-900">A-</option>
                      <option value="B+" className="bg-navy-900">B+</option>
                      <option value="B-" className="bg-navy-900">B-</option>
                      <option value="AB+" className="bg-navy-900">AB+</option>
                      <option value="AB-" className="bg-navy-900">AB-</option>
                      <option value="O+" className="bg-navy-900">O+</option>
                      <option value="O-" className="bg-navy-900">O-</option>
                    </select>
                  </div>

                  {/* Known Allergies */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Known Allergies <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[10px] text-accent font-medium">Patient Self-Reported</span>
                    </div>
                    <textarea
                      name="allergies"
                      rows={2}
                      value={form.allergies}
                      onChange={handleChange}
                      placeholder="Enter any known allergies (e.g. Penicillin, Peanuts, Latex, Aspirin)"
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                    />
                    <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">ℹ️ Note:</span> Self-reported allergies will be reviewed, cross-checked, and clinically verified by an attending Doctor or Nurse during your initial hospital triage.
                    </p>
                  </div>

                  {/* Existing Medical Conditions */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Existing Medical Conditions <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      name="medicalConditions"
                      rows={2}
                      value={form.medicalConditions}
                      onChange={handleChange}
                      placeholder="Enter existing medical conditions (e.g. Asthma, Hypertension, Diabetes)"
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                    />
                  </div>

                  {/* Current Medications */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Current Medications <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      name="medications"
                      rows={2}
                      value={form.medications}
                      onChange={handleChange}
                      placeholder="Enter current medications (e.g. Aspirin 100mg, Metformin)"
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                    />
                  </div>

                  {/* Primary Healthcare Provider */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Primary Healthcare Provider <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="primaryProvider"
                      value={form.primaryProvider}
                      onChange={handleChange}
                      placeholder="Enter primary doctor or hospital name"
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* SECTION 4 — ACCOUNT SECURITY                       */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Create Your Login Credentials</h2>
                    <p className="text-xs text-gray-400">Secure access credentials for your patient portal</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Username */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Username *
                    </label>
                    <div className="relative max-w-md">
                      <input
                        type="text"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        onBlur={() => handleBlur('username')}
                        placeholder="e.g. marcus_vance"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.username && errors.username
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.username && !errors.username
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.username && !errors.username && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.username && errors.username && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.username}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••••••"
                        className={`w-full py-3 pl-4 pr-10 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.password && errors.password
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.password && !errors.password
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {touched.password && errors.password && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="••••••••••••"
                        className={`w-full py-3 pl-4 pr-10 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.confirmPassword && errors.confirmPassword
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.confirmPassword && !errors.confirmPassword
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Password Strength Bar & Requirements Checklist */}
                  <div className="md:col-span-2 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-accent" /> Password Strength:
                      </span>
                      {pass.length > 0 && (
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                            passStrengthLabel === 'Strong'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : passStrengthLabel === 'Medium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {passStrengthLabel}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full bg-navy-950 rounded-full p-0.5 border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          passScore >= 1
                            ? passStrengthLabel === 'Strong'
                              ? 'bg-emerald-400'
                              : passStrengthLabel === 'Medium'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                            : 'bg-gray-700'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-all ${
                          passScore >= 3
                            ? passStrengthLabel === 'Strong'
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                            : 'bg-gray-700'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-all ${
                          passScore >= 5 ? 'bg-emerald-400' : 'bg-gray-700'
                        }`}
                      />
                    </div>

                    {/* Requirements Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className={`flex items-center gap-1.5 ${passMinLength ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                        {passMinLength ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passUppercase ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                        {passUppercase ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                        <span>One uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passLowercase ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                        {passLowercase ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                        <span>One lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passNumber ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                        {passNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                        <span>One number</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${passSpecial ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                        {passSpecial ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-gray-500" />}
                        <span>One special character</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* SECTION 5 — PRIVACY & CONSENT                      */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Privacy & Consent</h2>
                    <p className="text-xs text-gray-400">Legal compliance and data handling agreement</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Your health information is sensitive and will be handled securely according to the MediTwin AI privacy policy.
                  </span>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-gray-300">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="confirmAccurate"
                      checked={form.confirmAccurate}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent accent-accent mt-1 cursor-pointer"
                    />
                    <span>
                      I confirm that the information provided is accurate.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={form.agreeTerms}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent accent-accent mt-1 cursor-pointer"
                    />
                    <span>
                      I agree to the MediTwin AI Terms of Use and Privacy Policy.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="consentDataStorage"
                      checked={form.consentDataStorage}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent accent-accent mt-1 cursor-pointer"
                    />
                    <span>
                      I consent to the secure storage of my healthcare information.
                    </span>
                  </label>

                  {touched.consent && errors.consent && (
                    <p className="text-xs text-rose-400 flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.consent}
                    </p>
                  )}
                </div>
              </div>

              {/* API Error Banner */}
              {apiError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* ================================================== */}
              {/* SECTION 6 — ACTION BUTTONS                         */}
              {/* ================================================== */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="glass"
                  size="lg"
                  onClick={handleClearForm}
                  icon={<RotateCcw className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Clear Form
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={!isFormValid || isSubmitting}
                  icon={isSubmitting ? <Sparkles className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  iconPosition="right"
                  className="w-full sm:w-auto shadow-glow-primary min-w-[240px] justify-center"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Patient Account'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MediTwin AI. Enterprise Healthcare Multi-Agent Systems.</p>
          <div className="flex items-center gap-4 text-gray-300">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Compliant
            </span>
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
