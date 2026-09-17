import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, Loader2 } from 'lucide-react';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillEmail?: string;
  onSuccess: (user: any, role: string) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  prefillEmail = '',
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEmail(prefillEmail.trim() || 'angel01@gmail.com');
      setErrorMsg('');
      setIsLoading(false);
    }
  }, [isOpen, prefillEmail]);

  if (!isOpen) return null;

  const handleAuthenticate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email.trim()) {
      setErrorMsg('Enter an email or phone number');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const namePart = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      const nameParts = namePart.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Google';
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'User';

      const inferredRole =
        cleanEmail.includes('doctor') || cleanEmail.includes('dr.') ? 'doctor' :
        cleanEmail.includes('nurse') ? 'nurse' :
        cleanEmail.includes('admin') ? 'admin' :
        'patient';

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
          firstName,
          lastName,
          role: inferredRole,
          googleId: `goog_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess(data.user, data.user.role || inferredRole);
      } else {
        const offlineUser = {
          userId: `GOOGLE-${Date.now()}`,
          email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
          role: inferredRole,
          firstName,
          lastName,
        };
        onSuccess(offlineUser, inferredRole);
      }
    } catch {
      const cleanEmail = email.trim().toLowerCase();
      const namePart = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      const nameParts = namePart.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Google';
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'User';
      const inferredRole =
        cleanEmail.includes('doctor') || cleanEmail.includes('dr.') ? 'doctor' :
        cleanEmail.includes('nurse') ? 'nurse' :
        cleanEmail.includes('admin') ? 'admin' :
        'patient';

      const offlineUser = {
        userId: `GOOGLE-${Date.now()}`,
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@gmail.com`,
        role: inferredRole,
        firstName,
        lastName,
      };
      onSuccess(offlineUser, inferredRole);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Background container replicating Google Accounts window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[450px] flex flex-col items-center"
      >
        {/* Main Google Sign-in Card */}
        <div className="w-full bg-white rounded-lg shadow-2xl p-10 pt-11 pb-9 text-left relative overflow-hidden font-sans border border-[#dadce0]">
          {/* Top Loading Progress Line */}
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8f0fe] overflow-hidden">
              <motion.div
                className="h-full bg-[#1a73e8]"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: 'easeInOut',
                }}
                style={{ width: '50%' }}
              />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-3.5 right-3.5 p-1 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Google Logo Wordmark */}
          <div className="text-center mb-4">
            <svg
              className="h-7 w-auto mx-auto"
              viewBox="0 0 272 92"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"
                fill="#EA4335"
              />
              <path
                d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"
                fill="#FBBC05"
              />
              <path
                d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z"
                fill="#4285F4"
              />
              <path d="M225 3v65h-9.5V3h9.5z" fill="#34A853" />
              <path
                d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-13.43-8.08l19.82-8.24c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.94z"
                fill="#EA4335"
              />
              <path
                d="M35.29 41.41V32H67.4c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.43 9.66C16.03 69.35 0 53.8 0 34.68 0 15.55 16.03 0 35.29 0c9.83 0 16.97 3.86 22.26 8.82l-6.3 6.3c-3.86-3.61-8.99-6.38-15.96-6.38-14.45 0-25.79 11.68-25.79 25.96 0 14.28 11.34 25.96 25.79 25.96 9.32 0 14.62-3.78 18.06-7.22 2.77-2.77 4.62-6.72 5.38-12.03H35.29z"
                fill="#4285F4"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-[24px] font-normal text-[#202124] leading-tight">Sign in</h1>
            <p className="text-[16px] text-[#202124] mt-1 font-normal">with your Google Account</p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-4 text-xs text-[#d93025] flex items-center gap-1.5 font-sans">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleAuthenticate} className="space-y-8" noValidate>
            {/* Google Underlined Floating-style Input Field */}
            <div className="relative pt-2">
              <input
                id="google-email-input"
                type="text"
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                disabled={isLoading}
                placeholder="Email or phone"
                className="w-full py-2.5 px-0 text-[16px] text-[#202124] bg-transparent border-0 border-b border-[#dadce0] focus:border-b-2 focus:border-[#1a73e8] focus:outline-none transition-all placeholder-[#757575]"
              />
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setEmail('')}
                className="text-[14px] font-medium text-[#1a73e8] hover:text-[#174ea6] hover:underline transition-colors bg-transparent border-none p-0 cursor-pointer"
              >
                More options
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557d0] active:bg-[#174ea6] text-white font-medium text-[14px] uppercase tracking-wider rounded transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'NEXT'}
              </button>
            </div>
          </form>
        </div>

        {/* Outer Footer */}
        <div className="w-full flex items-center justify-between mt-4 px-2 text-[12px] text-[#757575]">
          <div className="flex items-center gap-1 cursor-pointer hover:text-[#202124]">
            <span>English (United States)</span>
            <span className="text-[10px]">▼</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-[#202124] cursor-pointer">Help</span>
            <span className="hover:text-[#202124] cursor-pointer">Privacy</span>
            <span className="hover:text-[#202124] cursor-pointer">Terms</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
