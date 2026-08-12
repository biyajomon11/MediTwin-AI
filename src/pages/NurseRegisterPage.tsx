import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HeartPulse,
  User,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Trash2,
  CheckSquare,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../components/Button';

export interface NurseFormData {
  fullName: string;
  dob: string;
  gender: string;
  countryCode: string;
  phone: string;
  email: string;
  address: string;
  nursingRegNo: string;
  qualification: string;
  customQualification: string;
  specialization: string;
  department: string;
  experienceYears: string;
  hospital: string;
  licenseNumber: string;
  issuingAuthority: string;
  licenseExpiry: string;
  username: string;
  password: string;
  confirmPassword: string;
  confirmAccurate: boolean;
  agreeTerms: boolean;
}

const initialForm: NurseFormData = {
  fullName: '',
  dob: '',
  gender: '',
  countryCode: '+1',
  phone: '',
  email: '',
  address: '',
  nursingRegNo: '',
  qualification: 'B.Sc Nursing',
  customQualification: '',
  specialization: 'General Nursing',
  department: 'General Medicine',
  experienceYears: '',
  hospital: '',
  licenseNumber: '',
  issuingAuthority: '',
  licenseExpiry: '',
  username: '',
  password: '',
  confirmPassword: '',
  confirmAccurate: false,
  agreeTerms: false,
};

export const NurseRegisterPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<NurseFormData>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    name: string;
    size: string;
    progress: number;
    error?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

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

  // 1. Full Name: Required, min 2 chars, letters & spaces only, no digits
  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  } else if (/[0-9]/.test(form.fullName)) {
    errors.fullName = 'Full name cannot contain numbers.';
  }

  // 2. Date of Birth: Required, valid date, must be before today, user must be at least 18 years old
  if (!form.dob) {
    errors.dob = 'Date of birth is required.';
  } else {
    const dobDate = new Date(form.dob);
    if (isNaN(dobDate.getTime())) {
      errors.dob = 'Please enter a valid date.';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dobDate >= today) {
        errors.dob = 'Date of birth must be before today.';
      } else {
        let age = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          age--;
        }
        if (age < 18) {
          errors.dob = 'Must be at least 18 years old.';
        }
      }
    }
  }

  // 3. Gender
  if (!form.gender) {
    errors.gender = 'Gender is required.';
  }

  // 4. Phone
  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!/^\d{10}$/.test(form.phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  // 5. Email
  if (!form.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  // 6. Nursing Registration Number
  if (!form.nursingRegNo.trim()) {
    errors.nursingRegNo = 'Nursing registration number is required.';
  }

  // 7. Nursing Qualification
  if (!form.qualification) {
    errors.qualification = 'Nursing qualification is required.';
  } else if (form.qualification === 'Other' && !form.customQualification.trim()) {
    errors.customQualification = 'Please specify your nursing qualification.';
  }

  // 8. Department
  if (!form.department) {
    errors.department = 'Department is required.';
  }

  // 9. Years of Experience
  if (!form.experienceYears.trim()) {
    errors.experienceYears = 'Years of experience is required.';
  } else {
    const exp = Number(form.experienceYears);
    if (isNaN(exp) || !Number.isInteger(exp)) {
      errors.experienceYears = 'Years of experience must be a valid number.';
    } else if (exp < 0) {
      errors.experienceYears = 'Years of experience cannot be negative.';
    } else if (exp > 60) {
      errors.experienceYears = 'Years of experience cannot exceed 60.';
    }
  }

  // 10. Hospital / Organization
  if (!form.hospital.trim()) {
    errors.hospital = 'Hospital or Organization is required.';
  }

  // 11. License Number
  if (!form.licenseNumber.trim()) {
    errors.licenseNumber = 'Nursing license number is required.';
  }

  // 12. Issuing Authority
  if (!form.issuingAuthority.trim()) {
    errors.issuingAuthority = 'Issuing authority is required.';
  }

  // 13. License Expiry Date
  if (!form.licenseExpiry) {
    errors.licenseExpiry = 'License expiry date is required.';
  } else {
    const expiryDate = new Date(form.licenseExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(expiryDate.getTime())) {
      errors.licenseExpiry = 'Please enter a valid expiry date.';
    } else if (expiryDate < today) {
      errors.licenseExpiry = 'License has expired.';
    }
  }

  // 14. Certificate Upload
  if (!uploadedFile) {
    errors.file = 'Please upload your nursing certificate.';
  } else if (uploadedFile.error) {
    errors.file = uploadedFile.error;
  }

  // 15. Username
  if (!form.username.trim()) {
    errors.username = 'Username is required.';
  } else if (form.username.trim().length < 4) {
    errors.username = 'Username must be at least 4 characters.';
  } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
    errors.username = 'Username can only contain letters, numbers, and underscores.';
  }

  // 16. Password & Password Strength Requirements
  const pass = form.password;
  const passMinLength = pass.length >= 8;
  const passUppercase = /[A-Z]/.test(pass);
  const passLowercase = /[a-z]/.test(pass);
  const passNumber = /[0-9]/.test(pass);
  const passSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
  const passValid = passMinLength && passUppercase && passLowercase && passNumber && passSpecial;

  // Password Strength Label calculation
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

  // 17. Confirm Password
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 18. Terms & Consent
  if (!form.confirmAccurate || !form.agreeTerms) {
    errors.consent = 'Please accept the Terms and Privacy Policy.';
  }

  const isFormValid = Object.keys(errors).length === 0;

  // File Upload Handlers
  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setUploadedFile({
        file: selectedFile,
        name: selectedFile.name,
        size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        progress: 0,
        error: 'Only PDF, JPG and PNG files are supported.',
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadedFile({
        file: selectedFile,
        name: selectedFile.name,
        size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        progress: 0,
        error: 'File size exceeds 10 MB limit.',
      });
      return;
    }

    setUploadedFile({
      file: selectedFile,
      name: selectedFile.name,
      size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
      progress: 100,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearForm = () => {
    setForm(initialForm);
    setUploadedFile(null);
    setTouched({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      const allTouched: Record<string, boolean> = {};
      Object.keys(form).forEach((k) => (allTouched[k] = true));
      setTouched(allTouched);
      return;
    }

    setIsSubmitting(true);

    // Save pending nurse record in localStorage
    const newNurseRecord = {
      id: 'USR-' + Math.floor(1000 + Math.random() * 9000),
      firstName: form.fullName.split(' ')[0] || form.fullName,
      lastName: form.fullName.split(' ').slice(1).join(' ') || '',
      email: form.email,
      role: 'nurse',
      department: form.department,
      qualification: form.qualification,
      specialization: form.specialization,
      nursingRegNo: form.nursingRegNo,
      hospital: form.hospital,
      status: 'Pending Verification',
      registeredAt: new Date().toISOString().split('T')[0],
      phone: `${form.countryCode} ${form.phone}`,
      dob: form.dob,
    };

    try {
      const stored = JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
      localStorage.setItem('meditwin_registered_users', JSON.stringify([newNurseRecord, ...stored]));
    } catch (err) {
      console.error('Error saving pending nurse registration:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans selection:bg-accent selection:text-navy-950">
      
      {/* PAGE HEADER */}
      <header className="border-b border-white/10 glass-nav sticky top-0 z-40 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-accent" />
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Clock className="w-3.5 h-3.5" /> Pending Verification
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Registration Submitted
              </h2>
              <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto">
                Your nurse registration has been successfully submitted.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 text-left space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Next Steps:
              </div>
              <p>
                Your professional credentials are currently under verification by the Hospital Administrator.
                Once verified, your nursing workstation access will be activated.
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
            
            {/* Title Banner */}
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
                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-primary text-white border border-accent/40 shadow-glow-primary flex items-center gap-1.5"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-accent" />
                  <span>Nurse</span>
                </Link>
                <Link
                  to="/register/patient"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
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
                <ShieldCheck className="w-4 h-4" /> 🔒 Your information is securely protected
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Create Nurse Account
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">
                Register as a healthcare professional to securely access MediTwin AI's nursing management platform.
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
                        max={(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })()}
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
                        placeholder="nurse@hospital.com"
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
                      Address <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      name="address"
                      rows={3}
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Enter residential or official address..."
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* SECTION 2 — PROFESSIONAL INFORMATION              */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Professional Information</h2>
                    <p className="text-xs text-gray-400">Nursing registration and clinical department assignment</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nursing Registration Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Nursing Registration Number *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="nursingRegNo"
                        value={form.nursingRegNo}
                        onChange={handleChange}
                        onBlur={() => handleBlur('nursingRegNo')}
                        placeholder="e.g. NRN-2024-99120"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.nursingRegNo && errors.nursingRegNo
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.nursingRegNo && !errors.nursingRegNo
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.nursingRegNo && !errors.nursingRegNo && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.nursingRegNo && errors.nursingRegNo && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.nursingRegNo}
                      </p>
                    )}
                  </div>

                  {/* Nursing Qualification */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Nursing Qualification *
                    </label>
                    <select
                      name="qualification"
                      value={form.qualification}
                      onChange={handleChange}
                      onBlur={() => handleBlur('qualification')}
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="B.Sc Nursing" className="bg-navy-900">B.Sc Nursing</option>
                      <option value="GNM" className="bg-navy-900">GNM</option>
                      <option value="M.Sc Nursing" className="bg-navy-900">M.Sc Nursing</option>
                      <option value="ANM" className="bg-navy-900">ANM</option>
                      <option value="Other" className="bg-navy-900">Other</option>
                    </select>

                    {form.qualification === 'Other' && (
                      <input
                        type="text"
                        name="customQualification"
                        value={form.customQualification}
                        onChange={handleChange}
                        onBlur={() => handleBlur('customQualification')}
                        placeholder="Specify Qualification (e.g. NP, RN-BSN)"
                        className="w-full py-2.5 px-4 mt-2 bg-navy-900 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                      />
                    )}
                    {touched.customQualification && errors.customQualification && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.customQualification}
                      </p>
                    )}
                  </div>

                  {/* Nursing Specialization */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Nursing Specialization <span className="text-gray-500 font-normal">(Optional)</span>
                    </label>
                    <select
                      name="specialization"
                      value={form.specialization}
                      onChange={handleChange}
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="General Nursing" className="bg-navy-900">General Nursing</option>
                      <option value="Critical Care" className="bg-navy-900">Critical Care</option>
                      <option value="Emergency Nursing" className="bg-navy-900">Emergency Nursing</option>
                      <option value="Pediatric Nursing" className="bg-navy-900">Pediatric Nursing</option>
                      <option value="Psychiatric Nursing" className="bg-navy-900">Psychiatric Nursing</option>
                      <option value="Community Health Nursing" className="bg-navy-900">Community Health Nursing</option>
                      <option value="Medical-Surgical Nursing" className="bg-navy-900">Medical-Surgical Nursing</option>
                      <option value="Other" className="bg-navy-900">Other</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      onBlur={() => handleBlur('department')}
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="General Medicine" className="bg-navy-900">General Medicine</option>
                      <option value="Cardiology" className="bg-navy-900">Cardiology</option>
                      <option value="Neurology" className="bg-navy-900">Neurology</option>
                      <option value="Pediatrics" className="bg-navy-900">Pediatrics</option>
                      <option value="Emergency" className="bg-navy-900">Emergency</option>
                      <option value="ICU" className="bg-navy-900">ICU</option>
                      <option value="Surgery" className="bg-navy-900">Surgery</option>
                      <option value="Orthopedics" className="bg-navy-900">Orthopedics</option>
                      <option value="Other" className="bg-navy-900">Other</option>
                    </select>
                  </div>

                  {/* Years of Experience */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Years of Experience *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        name="experienceYears"
                        value={form.experienceYears}
                        onChange={handleChange}
                        onBlur={() => handleBlur('experienceYears')}
                        placeholder="e.g. 5"
                        min={0}
                        max={60}
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.experienceYears && errors.experienceYears
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.experienceYears && !errors.experienceYears
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.experienceYears && !errors.experienceYears && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.experienceYears && errors.experienceYears && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.experienceYears}
                      </p>
                    )}
                  </div>

                  {/* Hospital / Organization */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Hospital / Organization *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="hospital"
                        value={form.hospital}
                        onChange={handleChange}
                        onBlur={() => handleBlur('hospital')}
                        placeholder="e.g. General City Hospital"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.hospital && errors.hospital
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.hospital && !errors.hospital
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.hospital && !errors.hospital && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.hospital && errors.hospital && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.hospital}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* SECTION 3 — PROFESSIONAL VERIFICATION              */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Professional Verification</h2>
                    <p className="text-xs text-gray-400">Nursing license verification and certificate upload</p>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Your professional credentials will be reviewed by the Hospital Administrator before your account is activated.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nursing License / Registration Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Nursing License / Registration Number *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="licenseNumber"
                        value={form.licenseNumber}
                        onChange={handleChange}
                        onBlur={() => handleBlur('licenseNumber')}
                        placeholder="e.g. NRN-LIC-8821"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.licenseNumber && errors.licenseNumber
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.licenseNumber && !errors.licenseNumber
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.licenseNumber && !errors.licenseNumber && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.licenseNumber && errors.licenseNumber && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.licenseNumber}
                      </p>
                    )}
                  </div>

                  {/* Issuing Nursing Council / Authority */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Issuing Nursing Council / Authority *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="issuingAuthority"
                        value={form.issuingAuthority}
                        onChange={handleChange}
                        onBlur={() => handleBlur('issuingAuthority')}
                        placeholder="e.g. State Nursing Council"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.issuingAuthority && errors.issuingAuthority
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.issuingAuthority && !errors.issuingAuthority
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.issuingAuthority && !errors.issuingAuthority && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.issuingAuthority && errors.issuingAuthority && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.issuingAuthority}
                      </p>
                    )}
                  </div>

                  {/* License Expiry Date */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      License Expiry Date *
                    </label>
                    <div className="relative max-w-md">
                      <input
                        type="date"
                        name="licenseExpiry"
                        value={form.licenseExpiry}
                        onChange={handleChange}
                        onBlur={() => handleBlur('licenseExpiry')}
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white focus:outline-none transition-all [color-scheme:dark] ${
                          touched.licenseExpiry && errors.licenseExpiry
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.licenseExpiry && !errors.licenseExpiry
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.licenseExpiry && !errors.licenseExpiry && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-10 top-3.5" />
                      )}
                    </div>
                    {touched.licenseExpiry && errors.licenseExpiry && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.licenseExpiry}
                      </p>
                    )}
                  </div>

                  {/* Drag and Drop Nursing Certificate Upload */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Nursing Certificate *
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />

                    {!uploadedFile ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                          isDragging
                            ? 'border-accent bg-accent/10 shadow-glow-accent'
                            : errors.file && touched.file
                            ? 'border-rose-500/60 bg-rose-500/5'
                            : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-accent/50'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Upload Nursing Certificate</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Drag and drop your document here or <span className="text-accent font-bold underline">Browse</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-2">
                            Accepted formats: <span className="text-gray-300 font-semibold">PDF, JPG, PNG</span> (Max 10 MB)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/15 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/30 flex items-center justify-center text-accent">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{uploadedFile.name}</p>
                              <p className="text-[11px] text-gray-400">{uploadedFile.size}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setUploadedFile(null)}
                            className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {uploadedFile.error ? (
                          <p className="text-xs text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {uploadedFile.error}
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Upload Verified
                              </span>
                              <span className="text-gray-400">100%</span>
                            </div>
                            <div className="w-full h-1.5 bg-navy-950 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full w-full" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {errors.file && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.file}
                      </p>
                    )}
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
                    <p className="text-xs text-gray-400">Secure access credentials for MediTwin AI workstation</p>
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
                        placeholder="e.g. nurse_sarah"
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
              {/* SECTION 5 — TERMS & CONSENT                        */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Terms & Consent</h2>
                    <p className="text-xs text-gray-400">Legal compliance and accuracy declaration</p>
                  </div>
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
                      I confirm that the information provided is accurate and my nursing credentials are currently valid and active.
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

                  {touched.consent && errors.consent && (
                    <p className="text-xs text-rose-400 flex items-center gap-1 pt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.consent}
                    </p>
                  )}
                </div>
              </div>

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
                  {isSubmitting ? 'Submitting Credentials...' : 'Create Nurse Account'}
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
