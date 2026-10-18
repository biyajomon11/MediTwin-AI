import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RotateCcw,
  Lock,
  User,
} from 'lucide-react';
import { Button } from './Button';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onPasswordResetSuccess?: (email: string) => void;
}

type Step = 'request' | 'verify' | 'success';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = '',
  onPasswordResetSuccess,
}) => {
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<{
    userName?: string;
    emailMasked?: string;
    userEmail?: string;
    userRole?: string;
  } | null>(null);

  // Sync initial identifier when opened
  useEffect(() => {
    if (isOpen) {
      setIdentifier(initialIdentifier || '');
      setStep('request');
      setError(null);
      setVerificationCode('');
      setGeneratedCode('');
      setNewPassword('');
      setConfirmPassword('');
      setAccountInfo(null);
    }
  }, [isOpen, initialIdentifier]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Step 1: Request Recovery Code ──────────────────────────────────────────
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your registered email or username.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedCode(data.code || '');
        setVerificationCode(data.code || ''); // Pre-populate for seamless verification
        setAccountInfo({
          userName: data.userName,
          emailMasked: data.emailMasked,
          userEmail: data.userEmail,
          userRole: data.userRole,
        });
        setStep('verify');
        setIsLoading(false);
        return;
      }

      // If backend returned error or user not found, check local storage accounts
      const localUsers = (() => {
        try {
          return JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
        } catch {
          return [];
        }
      })();

      const normalizedInput = cleanId.toLowerCase();
      const localUser = localUsers.find((u: any) => {
        const emailMatch = u.email && u.email.toLowerCase() === normalizedInput;
        const userMatch = u.username && u.username.toLowerCase() === normalizedInput;
        const regMatch = u.registrationNumber && u.registrationNumber.toLowerCase() === normalizedInput;
        const nameMatch = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(normalizedInput);
        return emailMatch || userMatch || regMatch || nameMatch;
      });

      if (localUser) {
        const localCode = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(localCode);
        setVerificationCode(localCode);
        setAccountInfo({
          userName: `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim() || localUser.email,
          emailMasked: localUser.email,
          userEmail: localUser.email,
          userRole: localUser.role || 'user',
        });
        setStep('verify');
        setIsLoading(false);
        return;
      }

      setError(data.error || `No healthcare workstation account found for "${cleanId}".`);
    } catch {
      // Offline fallback: check local storage accounts
      const localUsers = (() => {
        try {
          return JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
        } catch {
          return [];
        }
      })();

      const normalizedInput = cleanId.toLowerCase();
      const localUser = localUsers.find((u: any) => {
        const emailMatch = u.email && u.email.toLowerCase() === normalizedInput;
        const userMatch = u.username && u.username.toLowerCase() === normalizedInput;
        return emailMatch || userMatch;
      });

      if (localUser) {
        const localCode = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(localCode);
        setVerificationCode(localCode);
        setAccountInfo({
          userName: `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim() || localUser.email,
          emailMasked: localUser.email,
          userEmail: localUser.email,
          userRole: localUser.role || 'user',
        });
        setStep('verify');
      } else {
        setError('Unable to connect to healthcare authentication server. Please check your network.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify Code & Reset Password ──────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: accountInfo?.userEmail || identifier.trim(),
          code: verificationCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Also update local registered users if exists
        try {
          const raw = localStorage.getItem('meditwin_registered_users');
          if (raw) {
            const users = JSON.parse(raw);
            const target = accountInfo?.userEmail?.toLowerCase() || identifier.trim().toLowerCase();
            const updated = users.map((u: any) => {
              if (
                u.email?.toLowerCase() === target ||
                u.username?.toLowerCase() === target
              ) {
                return { ...u, password: newPassword };
              }
              return u;
            });
            localStorage.setItem('meditwin_registered_users', JSON.stringify(updated));
          }
        } catch {}

        setStep('success');
        if (onPasswordResetSuccess) {
          onPasswordResetSuccess(accountInfo?.userEmail || identifier.trim());
        }
        setIsLoading(false);
        return;
      }

      // Check if local code match for offline/demo
      if (generatedCode && verificationCode.trim() === generatedCode) {
        try {
          const raw = localStorage.getItem('meditwin_registered_users');
          if (raw) {
            const users = JSON.parse(raw);
            const target = accountInfo?.userEmail?.toLowerCase() || identifier.trim().toLowerCase();
            const updated = users.map((u: any) => {
              if (
                u.email?.toLowerCase() === target ||
                u.username?.toLowerCase() === target
              ) {
                return { ...u, password: newPassword };
              }
              return u;
            });
            localStorage.setItem('meditwin_registered_users', JSON.stringify(updated));
          }
        } catch {}

        setStep('success');
        if (onPasswordResetSuccess) {
          onPasswordResetSuccess(accountInfo?.userEmail || identifier.trim());
        }
        setIsLoading(false);
        return;
      }

      setError(data.error || 'Failed to reset password. Please check your verification code.');
    } catch {
      // Offline fallback
      if (generatedCode && verificationCode.trim() === generatedCode) {
        try {
          const raw = localStorage.getItem('meditwin_registered_users');
          if (raw) {
            const users = JSON.parse(raw);
            const target = accountInfo?.userEmail?.toLowerCase() || identifier.trim().toLowerCase();
            const updated = users.map((u: any) => {
              if (
                u.email?.toLowerCase() === target ||
                u.username?.toLowerCase() === target
              ) {
                return { ...u, password: newPassword };
              }
              return u;
            });
            localStorage.setItem('meditwin_registered_users', JSON.stringify(updated));
          }
        } catch {}

        setStep('success');
        if (onPasswordResetSuccess) {
          onPasswordResetSuccess(accountInfo?.userEmail || identifier.trim());
        }
      } else {
        setError('Network error: Unable to submit password reset request.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-navy-950/80 backdrop-blur-md"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-navy-900 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden z-10 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
      >
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-accent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-glow-accent/20">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 id="forgot-password-title" className="text-xl font-bold text-white tracking-tight">
              {step === 'request' && 'Reset Your Password'}
              {step === 'verify' && 'Verify & Set New Password'}
              {step === 'success' && 'Password Updated'}
            </h2>
            {(step === 'verify' || step === 'success') && (
              <p className="text-xs text-gray-400">
                {step === 'verify' && 'Enter the 6-digit code to update your password.'}
                {step === 'success' && 'Your healthcare workstation credentials have been reset.'}
              </p>
            )}
          </div>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-200"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </motion.div>
        )}

        {/* ── STEP 1: Request Recovery ────────────────────────────────────── */}
        {step === 'request' && (
          <form onSubmit={handleRequestRecovery} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Email Address or Username *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter registered email or username"
                  disabled={isLoading}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading || !identifier.trim()}
                icon={isLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                {isLoading ? 'Verifying Account...' : 'Send Recovery Code'}
              </Button>
            </div>
          </form>
        )}

        {/* ── STEP 2: Verify Code & Set New Password ──────────────────────── */}
        {step === 'verify' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Account Confirmation Banner */}
            <div className="p-3 bg-accent/10 border border-accent/25 rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  {accountInfo?.userName || 'Verified Account'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono text-[10px] uppercase font-bold tracking-wider">
                  {accountInfo?.userRole || 'User'}
                </span>
              </div>
              <div className="text-gray-300 text-[11px]">
                Recovery code issued for <span className="font-mono text-accent">{accountInfo?.emailMasked || identifier}</span>
              </div>

              {/* Demo Sandbox Alert displaying the code */}
              {generatedCode && (
                <div className="mt-2 pt-2 border-t border-accent/20 flex items-center justify-between text-[11px] text-accent">
                  <span className="font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                    Verification Code:
                  </span>
                  <span className="font-mono font-bold text-sm bg-accent/20 px-2.5 py-0.5 rounded-md border border-accent/30 text-white tracking-widest">
                    {generatedCode}
                  </span>
                </div>
              )}
            </div>

            {/* 6-Digit Code Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                6-Digit Recovery Code *
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, ''));
                  if (error) setError(null);
                }}
                placeholder="123456"
                disabled={isLoading}
                className="w-full text-center tracking-widest font-mono text-lg font-bold py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Re-enter new password"
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && confirmPassword && newPassword === confirmPassword && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Passwords match</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Back</span>
              </button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading || !verificationCode || !newPassword || !confirmPassword}
                icon={isLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                iconPosition="right"
              >
                {isLoading ? 'Updating Password...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Success Confirmation ────────────────────────────────── */}
        {step === 'success' && (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-glow-emerald">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Password Reset Successful!</h3>
              <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto leading-relaxed">
                Your MediTwin AI workstation credentials have been updated. You can now log into your healthcare workspace.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={onClose}
                className="w-full justify-center"
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Return to Sign In
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
