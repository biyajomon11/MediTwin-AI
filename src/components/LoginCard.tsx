import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, ShieldCheck } from 'lucide-react';
import { LoginForm } from './LoginForm';

export const LoginCard: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card p-6 sm:p-8 md:p-10 w-full max-w-md mx-auto border border-white/15 shadow-2xl relative overflow-hidden bg-navy-900/80 backdrop-blur-xl rounded-2xl"
    >
      {/* Subtle Top Ambient Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

      {/* Header Logo */}
      <div className="flex flex-col items-center justify-center space-y-3 mb-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-extrabold tracking-tight text-white">MediTwin</span>
              <span className="text-2xl font-black text-accent">AI</span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide block -mt-1">
              Healthcare Multi-Agent Workstation
            </span>
          </div>
        </Link>

        <div className="text-center pt-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            Sign in to continue to your healthcare workspace.
          </p>
        </div>
      </div>

      {/* Login Form */}
      <LoginForm />

      {/* Bottom Switch to Register */}
      <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-gray-300">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="text-accent font-bold hover:underline">
            Create Account
          </Link>
        </p>
      </div>

      {/* Footer Policy Links & Security Badge */}
      <div className="mt-6 flex items-center justify-between text-[11px] text-gray-400 pt-2">
        <div className="flex items-center gap-3">
          <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#terms" className="hover:text-white transition-colors">Terms & Conditions</a>
        </div>
        <div className="flex items-center gap-1 text-accent font-medium">
          <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Secured
        </div>
      </div>
    </motion.div>
  );
};
