import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import {
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Building2,
  User,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillEmail?: string;
  defaultRole?: string;
  onSuccess: (user: any, role: string, token?: string) => void;
}

type UserRole = 'patient' | 'doctor' | 'nurse' | 'admin';

const ROLES: { id: UserRole; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'patient', label: 'Patient', icon: User },
  { id: 'doctor', label: 'Doctor', icon: Stethoscope },
  { id: 'nurse', label: 'Nurse', icon: HeartPulse },
  { id: 'admin', label: 'Hospital Admin', icon: Building2 },
];

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  prefillEmail = '',
  defaultRole = 'patient',
  onSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>((defaultRole as UserRole) || 'patient');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [demoEmail, setDemoEmail] = useState(prefillEmail || 'user@example.com');
  const [showDemoForm, setShowDemoForm] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleConfigured = Boolean(
    googleClientId &&
    googleClientId.trim().length > 10 &&
    !googleClientId.includes('your-google-oauth-client-id')
  );

  if (!isOpen) return null;

  // Real Google Sign-In response handler (via Google Identity Services)
  const handleGoogleCredentialResponse = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      setErrorMsg('No credential returned by Google. Please try again.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialResponse.credential,
          role: selectedRole,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess(data.user, data.user.role || selectedRole, data.token);
      } else {
        setErrorMsg(data.error || 'Google authentication failed on server.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while contacting authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Development/Demo fallback handler
  const handleDemoSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!demoEmail.trim()) {
      setErrorMsg('Please enter an email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = demoEmail.trim().toLowerCase();
      const namePart = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      const nameParts = namePart.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Google';
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'User';

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
          firstName,
          lastName,
          role: selectedRole,
          googleId: `goog_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess(data.user, data.user.role || selectedRole, data.token);
      } else {
        setErrorMsg(data.error || 'Failed to authenticate demo user.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during demo authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-navy-900 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 text-left text-white overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-md p-2">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.8 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9c-.2-.7-.4-1.5-.4-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.3-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Google Authentication</h2>
              <p className="text-xs text-gray-400">Secure single sign-on with your Google Account</p>
            </div>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Select Workspace Role:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedRole(id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                    selectedRole === id
                      ? 'bg-accent/15 border-accent text-accent font-semibold shadow-glow-primary'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Existing users will log in to their registered role automatically.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign In Area */}
          {isGoogleConfigured ? (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-3">
                <span className="text-xs text-gray-300">Click below to authenticate with Google:</span>
                <div className="flex justify-center w-full">
                  <GoogleLogin
                    onSuccess={handleGoogleCredentialResponse}
                    onError={() => setErrorMsg('Google login popup was closed or cancelled.')}
                    theme="filled_blue"
                    shape="pill"
                    size="large"
                    text="continue_with"
                    width="280"
                  />
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-xs text-accent">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Google token with MediTwin server...</span>
                </div>
              )}
            </div>
          ) : (
            /* Setup Guide Banner when Client ID is not configured */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Google Cloud Console Setup Required for Live OAuth</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  To enable real Google popups, add your OAuth Client ID from Google Cloud Console to your <code className="bg-black/30 px-1 py-0.5 rounded text-white">.env</code> files:
                </p>
                <div className="bg-black/40 p-2.5 rounded-lg text-[10px] font-mono text-gray-300 space-y-1">
                  <div>1. Frontend: <span className="text-accent">VITE_GOOGLE_CLIENT_ID</span>="...apps.googleusercontent.com"</div>
                  <div>2. Backend: <span className="text-accent">GOOGLE_CLIENT_ID</span>="...apps.googleusercontent.com"</div>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline font-medium"
                  >
                    Open Google Cloud Console <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Dev/Demo Quick Login */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-300">Test Local Integration:</span>
                  <button
                    type="button"
                    onClick={() => setShowDemoForm(!showDemoForm)}
                    className="text-[11px] text-accent hover:underline font-medium"
                  >
                    {showDemoForm ? 'Hide manual test' : 'Enter custom test email'}
                  </button>
                </div>

                {showDemoForm ? (
                  <form onSubmit={handleDemoSignIn} className="space-y-3">
                    <input
                      type="email"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      placeholder="e.g. doctor.john@gmail.com"
                      className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 bg-accent hover:bg-accent/90 text-navy-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Sign In as {selectedRole.toUpperCase()}</span>
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDemoSignIn()}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span>Test Instant Sign-In as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Encrypted with OAuth 2.0 & MediTwin Database Security</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
