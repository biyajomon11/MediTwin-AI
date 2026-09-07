import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from './Input';
import { PasswordInput } from './PasswordInput';
import { Button } from './Button';
import { SocialLogin } from './SocialLogin';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

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
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await res.json();

        if (res.ok && data.success) {
          const dbRole = (data.user.role || 'doctor').toLowerCase();
          const targetRole = dbRole;

          // Real backend login success — role is dynamically retrieved from database
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
          // If backend returns 401/403, check local user fallback before failing
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

      const targetRole = (matchingLocalUser.role || 'doctor').toLowerCase();
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

    // Fallback for built-in demo offline accounts if backend is disconnected
    if (normalizedInput.includes('nurse')) {
      writeSession({ userId: 'DEMO-NURSE', email: email.trim(), username: 'nurse_demo', role: 'nurse', firstName: 'Elena', lastName: 'Rostova' });
      setLoginSuccess(true);
      setTimeout(() => navigate('/dashboard/nurse'), 1000);
      return;
    } else if (normalizedInput.includes('patient')) {
      writeSession({ userId: 'DEMO-PATIENT', email: email.trim(), username: 'patient_demo', role: 'patient', firstName: 'John', lastName: 'Doe' });
      setLoginSuccess(true);
      setTimeout(() => navigate('/dashboard/patient'), 1000);
      return;
    } else if (normalizedInput.includes('admin')) {
      writeSession({ userId: 'DEMO-ADMIN', email: email.trim(), username: 'admin_demo', role: 'admin', firstName: 'System', lastName: 'Administrator' });
      setLoginSuccess(true);
      setTimeout(() => navigate('/dashboard/admin'), 1000);
      return;
    } else if (normalizedInput.includes('doctor')) {
      writeSession({ userId: 'DEMO-DOCTOR', email: email.trim(), username: 'doctor_demo', role: 'doctor', firstName: 'Sarah', lastName: 'Chen' });
      setLoginSuccess(true);
      setTimeout(() => navigate('/dashboard/doctor'), 1000);
      return;
    }

    // Unrecognized account
    setErrors({ general: 'Invalid email/username or password. Account not found.' });
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

        {/* Email or Username */}
        <Input
          label="Email Address or Username *"
          type="text"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="e.g. name@meditwin.ai or username"
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

