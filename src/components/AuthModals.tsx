import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, User, Stethoscope, ArrowRight, ShieldCheck, CheckCircle2, Sparkles, Calendar, Droplets, Building2 } from 'lucide-react';
import { Button } from './Button';
import { LoginForm } from './LoginForm';
import { Input } from './Input';
import { PasswordInput } from './PasswordInput';
import { SocialLogin } from './SocialLogin';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
  onSwitchMode: (mode: 'login' | 'register') => void;
}

const departmentOptions = [
  'Cardiology',
  'Neurology',
  'Emergency & ICU',
  'Pediatrics',
  'Oncology',
  'Orthopedics',
  'Radiology',
  'Pathology & Lab',
  'General Surgery',
  'Internal Medicine',
  'Nursing Care',
  'Hospital Administration',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSwitchMode,
}) => {
  const navigate = useNavigate();

  // Registration state
  const [role, setRole] = useState<'doctor' | 'nurse' | 'patient' | 'admin'>('doctor');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [department, setDepartment] = useState('Cardiology');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const isMedicalRole = role === 'doctor' || role === 'nurse' || role === 'admin';

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !firstName ||
      !lastName ||
      !gender ||
      (isMedicalRole ? !department : !bloodGroup) ||
      !dob ||
      !email ||
      !password ||
      !confirmPassword ||
      password !== confirmPassword
    ) {
      return;
    }

    setIsLoading(true);

    const genderFormatted = gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Other';
    const username = email.trim().split('@')[0];

    // Try backend registration
    let backendUserId: number | string | null = null;
    try {
      let endpoint = `/api/register/${role}`;
      let bodyData: any = {
        firstName,
        lastName,
        email: email.trim(),
        password,
      };

      if (role === 'patient') {
        bodyData = {
          ...bodyData,
          dob,
          gender: genderFormatted,
          bloodGroup,
        };
      } else if (role === 'doctor') {
        bodyData = {
          ...bodyData,
          department,
          specialization: department,
        };
      } else if (role === 'nurse') {
        bodyData = {
          ...bodyData,
          department,
        };
      } else if (role === 'admin') {
        bodyData = {
          ...bodyData,
          department,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.userId) backendUserId = data.userId;
      }
    } catch (err) {
      console.warn('Backend registration failed, using local storage fallback:', err);
    }

    // Persist registered user to local database storage
    const newUserRecord = {
      id: backendUserId || 'USR-' + Math.floor(1000 + Math.random() * 9000),
      firstName,
      lastName,
      username,
      gender: genderFormatted,
      role,
      department: isMedicalRole ? department : undefined,
      bloodGroup: !isMedicalRole ? bloodGroup : undefined,
      dob,
      email: email.trim(),
      password,
      status: 'Active',
      registeredAt: new Date().toISOString().split('T')[0],
    };

    try {
      const existing = JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
      const filtered = existing.filter((u: any) => u.email !== email.trim() && u.username !== username);
      localStorage.setItem('meditwin_registered_users', JSON.stringify([newUserRecord, ...filtered]));
    } catch (err) {
      console.error('Error saving user to database storage:', err);
    }

    setIsLoading(false);
    setRegisteredSuccess(true);

    // Write a session so the dashboard role-guard can read the verified role
    const sessionUser = {
      userId: newUserRecord.id,
      email: newUserRecord.email,
      username: newUserRecord.username,
      role: newUserRecord.role,
      firstName,
      lastName,
    };
    localStorage.setItem('meditwin_token', 'demo-token');
    localStorage.setItem('meditwin_user', JSON.stringify(sessionUser));

    setTimeout(() => {
      const rolePath = role === 'admin' ? 'admin' : role;
      onClose();
      navigate(`/dashboard/${rolePath}`);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card max-w-xl w-full p-6 sm:p-8 relative border border-white/20 shadow-2xl bg-navy-900/95 my-8 rounded-2xl text-left max-h-[90vh] overflow-y-auto"
        >
          {/* Subtle Top Ambient Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-4 pt-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-extrabold text-white">MediTwin</span>
                <span className="text-xl font-black text-accent">AI</span>
              </div>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide block -mt-1">
                Enterprise Healthcare Portal
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {mode === 'login' ? 'Welcome Back' : 'Create Workstation Account'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              {mode === 'login'
                ? 'Sign in to continue to your healthcare workspace.'
                : 'Join over 50+ enterprise healthcare providers worldwide.'}
            </p>
          </div>

          {/* Body Content */}
          {mode === 'login' ? (
            <LoginForm />
          ) : registeredSuccess ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <div className="text-lg font-bold text-white">Registration Complete!</div>
              <p className="text-xs text-gray-300">Setting up your secure MediTwin workstation...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left">
              {/* Role Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Select System Role *
                </label>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {(['doctor', 'nurse', 'patient', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-1 rounded-xl capitalize font-medium transition-all ${
                        role === r
                          ? 'bg-primary text-white border border-accent/40 font-bold shadow-glow-primary'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="First Name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sarah"
                  icon={<User className="w-4 h-4" />}
                  required
                />
                <Input
                  label="Last Name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Miller"
                  icon={<User className="w-4 h-4" />}
                  required
                />
              </div>

              {/* Gender & Role Specific Field (Department for Doctor/Nurse/Admin vs Blood Group for Patient) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="w-full space-y-1.5 text-left">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Gender *
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 text-gray-400 pointer-events-none w-4 h-4" />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full py-3 pl-10 pr-4 text-sm text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 cursor-pointer"
                      required
                    >
                      <option value="male" className="bg-navy-900 text-white">Male</option>
                      <option value="female" className="bg-navy-900 text-white">Female</option>
                      <option value="other" className="bg-navy-900 text-white">Other</option>
                    </select>
                  </div>
                </div>

                {isMedicalRole ? (
                  <div className="w-full space-y-1.5 text-left">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Department in Hospital *
                    </label>
                    <div className="relative flex items-center">
                      <Building2 className="absolute left-3.5 text-gray-400 pointer-events-none w-4 h-4" />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full py-3 pl-10 pr-4 text-sm text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 cursor-pointer"
                        required
                      >
                        {departmentOptions.map((dept) => (
                          <option key={dept} value={dept} className="bg-navy-900 text-white">
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-1.5 text-left">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Blood Group *
                    </label>
                    <div className="relative flex items-center">
                      <Droplets className="absolute left-3.5 text-gray-400 pointer-events-none w-4 h-4" />
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full py-3 pl-10 pr-4 text-sm text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 cursor-pointer"
                        required
                      >
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                          <option key={bg} value={bg} className="bg-navy-900 text-white">{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Date of Birth & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Date of Birth *"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toLocaleDateString('en-CA')}
                  icon={<Calendar className="w-4 h-4" />}
                  required
                  className="[color-scheme:dark]"
                />

                <Input
                  label="Email *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
              </div>

              {/* Password & Verify Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PasswordInput
                  label="Password *"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />

                <PasswordInput
                  label="Verify Password *"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  error={password && confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
                  required
                />
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary accent-primary mt-0.5"
                    required
                  />
                  <span>I agree to HIPAA compliance guidelines & Terms of Service</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={
                  isLoading ||
                  !firstName ||
                  !lastName ||
                  !gender ||
                  (isMedicalRole ? !department : !bloodGroup) ||
                  !dob ||
                  !email ||
                  !password ||
                  !confirmPassword ||
                  password !== confirmPassword ||
                  !agreeTerms
                }
                className="w-full justify-center mt-2"
                icon={isLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                {isLoading ? 'Creating Account...' : 'Complete Registration'}
              </Button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-navy-900 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest absolute">
                  OR
                </span>
              </div>

              <SocialLogin onSocialClick={() => navigate('/dashboard/doctor')} />
            </form>
          )}

          {/* Switch Mode Link */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-gray-300">
            {mode === 'login' ? (
              <p>
                Don't have an enterprise account?{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode('register')}
                  className="text-accent font-bold hover:underline"
                >
                  Create Account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onSwitchMode('login')}
                  className="text-accent font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

          <div className="mt-4 text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Encrypted via 256-bit SSL & HIPAA Vault
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

