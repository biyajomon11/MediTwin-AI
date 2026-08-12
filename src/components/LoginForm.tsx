import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Sparkles, AlertCircle, CheckCircle2, UserCheck, Stethoscope, HeartPulse, User, Building, ShieldCheck } from 'lucide-react';
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

  // Quick Demo Accounts list
  const demoAccounts = [
    { role: 'Doctor', email: 'doctor@meditwin.ai', path: 'doctor', icon: Stethoscope },
    { role: 'Nurse', email: 'nurse@meditwin.ai', path: 'nurse', icon: HeartPulse },
    { role: 'Patient', email: 'patient@meditwin.ai', path: 'patient', icon: User },
    { role: 'Hospital Admin', email: 'admin@meditwin.ai', path: 'hospital-admin', icon: Building },
    { role: 'System Admin', email: 'sysadmin@meditwin.ai', path: 'system-admin', icon: ShieldCheck },
  ];

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email or Username is required';
    } else if (email.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('MediTwin2026!');
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    setTimeout(() => {
      setIsLoading(false);

      // Determine redirection target based on role credentials
      let roleTarget = 'doctor';
      const cleanEmail = email.toLowerCase().trim();

      if (cleanEmail.includes('nurse')) {
        roleTarget = 'nurse';
      } else if (cleanEmail.includes('patient')) {
        roleTarget = 'patient';
      } else if (cleanEmail.includes('sysadmin') || cleanEmail.includes('system')) {
        roleTarget = 'system-admin';
      } else if (cleanEmail.includes('admin') || cleanEmail.includes('hospital')) {
        roleTarget = 'hospital-admin';
      }

      setLoginSuccess(true);

      setTimeout(() => {
        navigate(`/dashboard/${roleTarget}`);
      }, 1000);
    }, 1200);
  };

  const handleSocialLogin = (_provider: 'google' | 'microsoft') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(true);
      setTimeout(() => {
        navigate('/dashboard/doctor');
      }, 800);
    }, 1000);
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Demo Account Quick-Fill Bar */}
      <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-left">
        <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5" /> Try Quick Demo Workstation Login:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {demoAccounts.map((acc) => {
            const Icon = acc.icon;
            return (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickFill(acc.email)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-accent/20 hover:border-accent/40 border border-white/15 text-[11px] text-gray-200 font-medium transition-all flex items-center gap-1 cursor-pointer"
              >
                <Icon className="w-3 h-3 text-accent" />
                <span>{acc.role}</span>
              </button>
            );
          })}
        </div>
      </div>

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
          label="Email or Username *"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="doctor@meditwin.ai"
          icon={<Mail className="w-4 h-4" />}
          error={errors.email}
          disabled={isLoading || loginSuccess}
        />

        {/* Password Input */}
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

        {/* Submit Sign In Button */}
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
