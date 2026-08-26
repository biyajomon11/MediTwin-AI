import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Sparkles, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { Input } from './Input';
import { PasswordInput } from './PasswordInput';
import { Button } from './Button';
import { SocialLogin } from './SocialLogin';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const roles = [
    { value: 'doctor',  label: 'Doctor'  },
    { value: 'nurse',   label: 'Nurse'   },
    { value: 'patient', label: 'Patient' },
    { value: 'admin',   label: 'Admin'   },
  ];

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email or username is required';
    } else if (email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!email.includes('@') && email.trim().length < 3) {
      newErrors.email = 'Username must be at least 3 characters';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Session writer helper ───────────────────────────────────────────────
  const writeSession = (userObj: { userId: string | number; email: string; role: string; username?: string; firstName?: string; lastName?: string }) => {
    if (rememberMe) {
      localStorage.setItem('meditwin_token', 'demo-token');
      localStorage.setItem('meditwin_user', JSON.stringify(userObj));
    } else {
      sessionStorage.setItem('meditwin_token', 'demo-token');
      sessionStorage.setItem('meditwin_user', JSON.stringify(userObj));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    const normalizedInput = email.trim().toLowerCase();

    // Check local registered users (e.g. from registration pages or AuthModals)
    const localUsers = (() => {
      try {
        return JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
      } catch {
        return [];
      }
    })();

    const matchingLocalUser = localUsers.find((u: any) => {
      const emailMatch = u.email && u.email.toLowerCase() === normalizedInput;
      const usernameMatch = u.username && u.username.toLowerCase() === normalizedInput;
      const fullNameMatch = u.firstName && u.lastName && `${u.firstName} ${u.lastName}`.toLowerCase() === normalizedInput;
      const firstNameMatch = u.firstName && u.firstName.toLowerCase() === normalizedInput;
      return emailMatch || usernameMatch || fullNameMatch || firstNameMatch;
    });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, role }),
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await res.json();

        if (res.ok && data.success) {
          const dbRole = (data.user.role || '').toLowerCase();
          const targetRole = dbRole || role.toLowerCase();

          // Real backend login success
          const sessionUser = {
            ...data.user,
            role: targetRole,
          };

          if (rememberMe) {
            localStorage.setItem('meditwin_token', data.token);
            localStorage.setItem('meditwin_user', JSON.stringify(sessionUser));
          } else {
            sessionStorage.setItem('meditwin_token', data.token);
            sessionStorage.setItem('meditwin_user', JSON.stringify(sessionUser));
          }

          setLoginSuccess(true);
          setTimeout(() => {
            const dashboardPath =
              targetRole === 'admin' || targetRole === 'hospital-admin' ? 'admin' :
              targetRole === 'doctor'  ? 'doctor'  :
              targetRole === 'nurse'   ? 'nurse'   :
              targetRole === 'patient' ? 'patient' :
              targetRole;
            navigate(`/dashboard/${dashboardPath}`);
          }, 1000);
          return;
        } else {
          // If backend returns 401/403, try local user fallback first before failing
          if (!matchingLocalUser) {
            setErrors({ general: data.error || 'Invalid email/username or password.' });
            setIsLoading(false);
            return;
          }
        }
      }
    } catch {
      // Backend unreachable or offline — proceed to local storage fallback
    }

    // ── Local Registered User Fallback (Offline Mode) ──────────────────────
    if (matchingLocalUser) {
      if (matchingLocalUser.password && matchingLocalUser.password !== password) {
        setErrors({ general: 'Invalid password. Please enter the correct password for your account.' });
        setIsLoading(false);
        return;
      }

      const targetRole = (matchingLocalUser.role || role).toLowerCase();
      writeSession({
        userId: matchingLocalUser.id || 'USR-LOCAL',
        email: matchingLocalUser.email || email.trim(),
        username: matchingLocalUser.username || email.trim(),
        role: targetRole,
        firstName: matchingLocalUser.firstName,
        lastName: matchingLocalUser.lastName,
      });

      setLoginSuccess(true);
      setTimeout(() => {
        const dashboardPath =
          targetRole === 'admin' || targetRole === 'hospital-admin' ? 'admin' :
          targetRole === 'doctor'  ? 'doctor'  :
          targetRole === 'nurse'   ? 'nurse'   :
          targetRole === 'patient' ? 'patient' :
          targetRole;
        navigate(`/dashboard/${dashboardPath}`);
      }, 1000);
      return;
    }

    // Built-in Demo accounts role check (prevent cross-role login)
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.includes('doctor') && role !== 'doctor') {
      setErrors({ general: 'Access denied. Doctor credentials cannot log in as Nurse, Patient, or Admin.' });
      setIsLoading(false);
      return;
    }
    if (normalizedEmail.includes('nurse') && role !== 'nurse') {
      setErrors({ general: 'Access denied. Nurse credentials cannot log in as Doctor, Patient, or Admin.' });
      setIsLoading(false);
      return;
    }
    if (normalizedEmail.includes('patient') && role !== 'patient') {
      setErrors({ general: 'Access denied. Patient credentials cannot log in as Doctor, Nurse, or Admin.' });
      setIsLoading(false);
      return;
    }
    if (normalizedEmail.includes('admin') && role !== 'admin') {
      setErrors({ general: 'Access denied. Admin credentials cannot log in as Doctor, Nurse, or Patient.' });
      setIsLoading(false);
      return;
    }

    // Unrecognized account
    setErrors({ general: 'Account not found. Please check your email/username and select the correct role.' });
    setIsLoading(false);
  };

  const handleSocialLogin = (_provider: 'google' | 'microsoft') => {
    // Social login not connected to backend — placeholder behaviour
    setErrors({ general: 'Social login is not yet configured. Please use email and password.' });
  };

  return (
    <div className="w-full space-y-6">

      {/* General Error Banner */}
      {errors.general && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errors.general}</span>
        </motion.div>
      )}

      {/* Success Notification Banner */}
      {loginSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
          <span>Authentication Verified! Opening Workstation...</span>
        </motion.div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>

        {/* Role Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Login As *</label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isLoading || loginSuccess}
              className="w-full appearance-none bg-white/5 border border-white/15 text-white text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value} className="bg-[#0F172A] text-white">
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Email or Username */}
        <Input
          label="Email Address or Username *"
          type="text"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="e.g. admin@meditwin.ai or admin_username"
          icon={<Mail className="w-4 h-4" />}
          error={errors.email}
          disabled={isLoading || loginSuccess}
        />

        {/* Password */}
        <PasswordInput
          label="Password *"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          disabled={isLoading || loginSuccess}
        />

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300 hover:text-white">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-accent accent-primary cursor-pointer"
            />
            <span>Remember Me</span>
          </label>

          <a
            href="#forgot-password"
            onClick={(e) => {
              e.preventDefault();
              alert('Password reset link sent to your administrator.');
            }}
            className="text-accent font-semibold hover:underline"
          >
            Forgot Password?
          </a>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isLoading || loginSuccess || !email || !password}
          className="w-full justify-center mt-2"
          icon={isLoading ? <Sparkles className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          iconPosition="right"
        >
          {isLoading ? 'Authenticating Workstation...' : 'Sign In'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-white/10 w-full" />
        <span className="bg-navy-900 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest absolute">
          OR
        </span>
      </div>

      {/* Social Login Buttons */}
      <SocialLogin onSocialClick={handleSocialLogin} />
    </div>
  );
};
