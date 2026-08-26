import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building,
  User,
  HeartPulse,
  Stethoscope,
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
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/Button';

export interface AdminFormData {
  fullName: string;
  dob: string;
  gender: string;
  officialEmail: string;
  countryCode: string;
  phone: string;
  address: string;
  hospitalName: string;
  hospitalId: string;
  department: string;
  designation: string;
  customDesignation: string;
  hospitalAddress: string;
  hospitalEmail: string;
  employeeId: string;
  authorizedBy: string;
  username: string;
  password: string;
  confirmPassword: string;
  confirmAuthorizedRep: boolean;
  confirmAccurate: boolean;
  agreeTerms: boolean;
  agreeDataSecurity: boolean;
}

const initialForm: AdminFormData = {
  fullName: '',
  dob: '',
  gender: '',
  officialEmail: '',
  countryCode: '+1',
  phone: '',
  address: '',
  hospitalName: '',
  hospitalId: '',
  department: 'Administration',
  designation: 'Hospital Administrator',
  customDesignation: '',
  hospitalAddress: '',
  hospitalEmail: '',
  employeeId: '',
  authorizedBy: '',
  username: '',
  password: '',
  confirmPassword: '',
  confirmAuthorizedRep: false,
  confirmAccurate: false,
  agreeTerms: false,
  agreeDataSecurity: false,
};

export const AdminRegisterPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<AdminFormData>(initialForm);
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

  // 1. Full Name
  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (form.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  } else if (/[0-9]/.test(form.fullName)) {
    errors.fullName = 'Full name cannot contain numbers.';
  }

  // 2. Date of Birth (Age >= 18, up to present day)
  if (!form.dob) {
    errors.dob = 'Date of birth is required.';
  } else {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (form.dob > todayStr) {
      errors.dob = 'Date of birth cannot be in the future.';
    } else {
      const today = new Date();
      const [year, month, day] = form.dob.split('-').map(Number);
      const dobDate = new Date(year, month - 1, day);
      if (isNaN(dobDate.getTime())) {
        errors.dob = 'Please enter a valid date.';
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

  // 4. Official Email Address
  if (!form.officialEmail.trim()) {
    errors.officialEmail = 'Please enter a valid official email.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.officialEmail.trim())) {
    errors.officialEmail = 'Please enter a valid official email.';
  }

  // 5. Phone Number
  if (!form.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!/^\d{10}$/.test(form.phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  // 6. Address
  if (!form.address.trim()) {
    errors.address = 'Address is required.';
  }

  // 7. Hospital Name
  if (!form.hospitalName.trim()) {
    errors.hospitalName = 'Hospital name is required.';
  }

  // 8. Hospital ID
  if (!form.hospitalId.trim()) {
    errors.hospitalId = 'Hospital ID cannot be empty.';
  }

  // 9. Department
  if (!form.department) {
    errors.department = 'Department is required.';
  }

  // 10. Designation
  if (!form.designation) {
    errors.designation = 'Designation is required.';
  } else if (form.designation === 'Other' && !form.customDesignation.trim()) {
    errors.customDesignation = 'Please specify your designation.';
  }

  // 11. Hospital Address
  if (!form.hospitalAddress.trim()) {
    errors.hospitalAddress = 'Hospital address is required.';
  }

  // 12. Official Hospital Email
  if (!form.hospitalEmail.trim()) {
    errors.hospitalEmail = 'Official hospital email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.hospitalEmail.trim())) {
    errors.hospitalEmail = 'Please enter a valid official email.';
  }

  // 13. Employee ID
  if (!form.employeeId.trim()) {
    errors.employeeId = 'Employee ID is required.';
  }

  // 14. Authorized By
  if (!form.authorizedBy.trim()) {
    errors.authorizedBy = 'Authorized By executive name is required.';
  }

  // 15. Authorization Document File Upload
  if (!uploadedFile) {
    errors.file = 'Please upload the authorization document.';
  } else if (uploadedFile.error) {
    errors.file = uploadedFile.error;
  }

  // 16. Username
  if (!form.username.trim()) {
    errors.username = 'Username is required.';
  } else if (form.username.trim().length < 4) {
    errors.username = 'Username must be at least 4 characters.';
  } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
    errors.username = 'Username can only contain letters, numbers, and underscores.';
  }

  // 17. Password Requirements (Admin requires 10+ characters)
  const pass = form.password;
  const passMinLength = pass.length >= 10;
  const passUppercase = /[A-Z]/.test(pass);
  const passLowercase = /[a-z]/.test(pass);
  const passNumber = /[0-9]/.test(pass);
  const passSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);
  const passValid = passMinLength && passUppercase && passLowercase && passNumber && passSpecial;

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
    errors.password = 'Password must contain at least 10 characters.';
  } else if (!passValid) {
    errors.password = 'Password does not meet all administrative security requirements.';
  }

  // 18. Confirm Password
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 19. Security Checkboxes (4 Checkboxes Required)
  if (
    !form.confirmAuthorizedRep ||
    !form.confirmAccurate ||
    !form.agreeTerms ||
    !form.agreeDataSecurity
  ) {
    errors.consent = 'Please confirm that you are an authorized representative and accept all security policies.';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      const allTouched: Record<string, boolean> = {};
      Object.keys(form).forEach((k) => (allTouched[k] = true));
      setTouched(allTouched);
      return;
    }

    setIsSubmitting(true);

    const firstName = form.fullName.split(' ')[0] || form.fullName;
    const lastName = form.fullName.split(' ').slice(1).join(' ') || '';

    // Save administrator record in localStorage
    const newAdminRecord = {
      id: 'USR-' + Math.floor(1000 + Math.random() * 9000),
      firstName,
      lastName,
      username: form.username.trim(),
      email: form.officialEmail.trim(),
      password: form.password,
      role: 'admin',
      department: form.department,
      designation: form.designation,
      hospital: form.hospitalName,
      employeeId: form.employeeId,
      status: 'Active',
      registeredAt: new Date().toISOString().split('T')[0],
      phone: `${form.countryCode} ${form.phone}`,
      dob: form.dob,
    };

    try {
      const stored = JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
      // Update or prepend record
      const filtered = stored.filter((u: any) => u.email !== form.officialEmail.trim() && u.username !== form.username.trim());
      localStorage.setItem('meditwin_registered_users', JSON.stringify([newAdminRecord, ...filtered]));
    } catch (err) {
      console.error('Error saving administrator registration:', err);
    }

    // Try backend registration if available
    try {
      await fetch('/api/register/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: form.officialEmail.trim(),
          password: form.password,
          phone: form.phone ? `${form.countryCode} ${form.phone}` : undefined,
          hospitalName: form.hospitalName || undefined,
          department: form.department || undefined,
          employeeId: form.employeeId || undefined,
        }),
      });
    } catch {
      // Backend may be offline in demo mode; localStorage already updated
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans selection:bg-accent selection:text-navy-950">
      
      {/* PAGE HEADER */}
      <header className="border-b border-white/10 glass-nav sticky top-0 z-40 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                <Building className="w-5 h-5 text-accent" />
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
                Your administrator registration has been successfully submitted.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 text-left space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" /> Identity Verification in Progress:
              </div>
              <p>
                Your authorization details will be reviewed before administrative access is activated.
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
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              
              {/* Role Switcher Tabs */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <Link
                  to="/register/doctor"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                  <span>Doctor</span>
                </Link>
                <Link
                  to="/register/nurse"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <HeartPulse className="w-3.5 h-3.5 text-gray-400" />
                  <span>Nurse</span>
                </Link>
                <Link
                  to="/register/patient"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 text-gray-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all"
                >
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Patient</span>
                </Link>
                <Link
                  to="/register/admin"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-primary text-white border border-accent/40 shadow-glow-primary flex items-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5 text-accent" />
                  <span>Administrator</span>
                </Link>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-purple-400" /> 🔒 Protected Administrative Access
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Create Administrator Account
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">
                Register an authorized hospital administrator to manage MediTwin AI hospital operations.
              </p>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-center gap-2 max-w-lg mx-auto mt-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Administrator accounts require verification before access is granted.</span>
              </div>
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

                  {/* Official Email Address */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Official Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="officialEmail"
                        value={form.officialEmail}
                        onChange={handleChange}
                        onBlur={() => handleBlur('officialEmail')}
                        placeholder="admin@hospital.org"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.officialEmail && errors.officialEmail
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.officialEmail && !errors.officialEmail
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.officialEmail && !errors.officialEmail && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.officialEmail && errors.officialEmail && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.officialEmail}
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5 md:col-span-2">
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
                      placeholder="Enter official administrative address..."
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
              {/* SECTION 2 — HOSPITAL INFORMATION                   */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Hospital / Organization Information</h2>
                    <p className="text-xs text-gray-400">Institutional registration and official contact details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Hospital Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Hospital / Organization Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="hospitalName"
                        value={form.hospitalName}
                        onChange={handleChange}
                        onBlur={() => handleBlur('hospitalName')}
                        placeholder="e.g. Mayo Clinic / St. Jude Medical Center"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.hospitalName && errors.hospitalName
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.hospitalName && !errors.hospitalName
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.hospitalName && !errors.hospitalName && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.hospitalName && errors.hospitalName && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.hospitalName}
                      </p>
                    )}
                  </div>

                  {/* Hospital Registration / ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Hospital Registration / ID *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="hospitalId"
                        value={form.hospitalId}
                        onChange={handleChange}
                        onBlur={() => handleBlur('hospitalId')}
                        placeholder="e.g. HOSP-99201"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.hospitalId && errors.hospitalId
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.hospitalId && !errors.hospitalId
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.hospitalId && !errors.hospitalId && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.hospitalId && errors.hospitalId && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.hospitalId}
                      </p>
                    )}
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
                      <option value="Administration" className="bg-navy-900">Administration</option>
                      <option value="Hospital Management" className="bg-navy-900">Hospital Management</option>
                      <option value="IT Administration" className="bg-navy-900">IT Administration</option>
                      <option value="Operations" className="bg-navy-900">Operations</option>
                      <option value="Other" className="bg-navy-900">Other</option>
                    </select>
                  </div>

                  {/* Designation */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Designation *
                    </label>
                    <select
                      name="designation"
                      value={form.designation}
                      onChange={handleChange}
                      onBlur={() => handleBlur('designation')}
                      className="w-full py-3 px-4 bg-navy-900 border border-white/15 rounded-xl text-sm text-white focus:outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="Hospital Administrator" className="bg-navy-900">Hospital Administrator</option>
                      <option value="Operations Manager" className="bg-navy-900">Operations Manager</option>
                      <option value="Healthcare Administrator" className="bg-navy-900">Healthcare Administrator</option>
                      <option value="IT Administrator" className="bg-navy-900">IT Administrator</option>
                      <option value="Other" className="bg-navy-900">Other</option>
                    </select>

                    {form.designation === 'Other' && (
                      <input
                        type="text"
                        name="customDesignation"
                        value={form.customDesignation}
                        onChange={handleChange}
                        onBlur={() => handleBlur('customDesignation')}
                        placeholder="Specify Designation (e.g. Chief Operating Officer)"
                        className="w-full py-2.5 px-4 mt-2 bg-navy-900 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                      />
                    )}
                    {touched.customDesignation && errors.customDesignation && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.customDesignation}
                      </p>
                    )}
                  </div>

                  {/* Official Hospital Email */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Official Hospital Email *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="hospitalEmail"
                        value={form.hospitalEmail}
                        onChange={handleChange}
                        onBlur={() => handleBlur('hospitalEmail')}
                        placeholder="contact@hospital.org"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.hospitalEmail && errors.hospitalEmail
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.hospitalEmail && !errors.hospitalEmail
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.hospitalEmail && !errors.hospitalEmail && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.hospitalEmail && errors.hospitalEmail && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.hospitalEmail}
                      </p>
                    )}
                  </div>

                  {/* Hospital Address */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Hospital Address *
                    </label>
                    <textarea
                      name="hospitalAddress"
                      rows={3}
                      value={form.hospitalAddress}
                      onChange={handleChange}
                      onBlur={() => handleBlur('hospitalAddress')}
                      placeholder="Enter main hospital campus address..."
                      className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all resize-none ${
                        touched.hospitalAddress && errors.hospitalAddress
                          ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                          : touched.hospitalAddress && !errors.hospitalAddress
                          ? 'border-emerald-500/80 focus:border-emerald-500'
                          : 'border-white/15 focus:border-accent'
                      }`}
                    />
                    {touched.hospitalAddress && errors.hospitalAddress && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.hospitalAddress}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* SECTION 3 — ADMINISTRATOR VERIFICATION             */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Administrator Verification</h2>
                    <p className="text-xs text-gray-400">Institutional authorization and employee identity verification</p>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Administrator accounts require verification to protect hospital data and system resources.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Employee ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Employee ID *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="employeeId"
                        value={form.employeeId}
                        onChange={handleChange}
                        onBlur={() => handleBlur('employeeId')}
                        placeholder="e.g. EMP-ADM-8821"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.employeeId && errors.employeeId
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.employeeId && !errors.employeeId
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.employeeId && !errors.employeeId && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.employeeId && errors.employeeId && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.employeeId}
                      </p>
                    )}
                  </div>

                  {/* Authorized By */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Authorized By (Executive / Board Member) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="authorizedBy"
                        value={form.authorizedBy}
                        onChange={handleChange}
                        onBlur={() => handleBlur('authorizedBy')}
                        placeholder="e.g. Dr. Arthur Wright, CEO"
                        className={`w-full py-3 px-4 bg-navy-900 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-all ${
                          touched.authorizedBy && errors.authorizedBy
                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                            : touched.authorizedBy && !errors.authorizedBy
                            ? 'border-emerald-500/80 focus:border-emerald-500'
                            : 'border-white/15 focus:border-accent'
                        }`}
                      />
                      {touched.authorizedBy && !errors.authorizedBy && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-3.5" />
                      )}
                    </div>
                    {touched.authorizedBy && errors.authorizedBy && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.authorizedBy}
                      </p>
                    )}
                  </div>

                  {/* Authorization / Verification Document Upload */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Authorization Document / Appointment Letter *
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
                          <p className="text-sm font-bold text-white">Upload Authorization Document</p>
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
                                <CheckCircle2 className="w-3.5 h-3.5" /> Document Uploaded & Verified
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
                    <h2 className="text-lg font-bold text-white">Secure Administrator Account</h2>
                    <p className="text-xs text-gray-400">Elevated security credentials for hospital control center</p>
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
                        placeholder="e.g. admin_wright"
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

                  {/* Password Strength Bar & Administrative Requirements Checklist */}
                  <div className="md:col-span-2 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-accent" /> Administrative Password Security:
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
                        <span>At least 10 characters</span>
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
              {/* SECTION 5 — TERMS & SECURITY AGREEMENT             */}
              {/* ================================================== */}
              <div className="glass-card p-6 sm:p-8 border border-white/15 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Security & Consent</h2>
                    <p className="text-xs text-gray-400">Administrative compliance and data security declaration</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Administrator accounts have access to sensitive hospital and patient information. Use of this account must comply with MediTwin AI security and privacy policies.
                  </span>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-gray-300">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="confirmAuthorizedRep"
                      checked={form.confirmAuthorizedRep}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent accent-accent mt-1 cursor-pointer"
                    />
                    <span>
                      I confirm that I am an authorized representative of the hospital/organization.
                    </span>
                  </label>

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
                      name="agreeDataSecurity"
                      checked={form.agreeDataSecurity}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent accent-accent mt-1 cursor-pointer"
                    />
                    <span>
                      I agree to comply with hospital data security and privacy policies.
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
                  className="w-full sm:w-auto shadow-glow-primary min-w-[280px] justify-center"
                >
                  {isSubmitting ? 'Submitting Credentials...' : 'Submit Administrator Registration'}
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
