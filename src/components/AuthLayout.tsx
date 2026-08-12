import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Network, Building2, CheckCircle2 } from 'lucide-react';
import { HealthcareIllustration } from './HealthcareIllustration';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const authBadges = [
    { title: 'Secure Login', desc: 'HIPAA & 256-bit SSL Vault', icon: ShieldCheck },
    { title: 'AI Powered', desc: 'Real-time Clinical Assistance', icon: Cpu },
    { title: 'Multi-Agent Healthcare', desc: 'Autonomous Task Swarm', icon: Network },
    { title: 'Enterprise Ready', desc: '99.9% Uptime SLA Certified', icon: Building2 },
  ];

  return (
    <div className="min-h-screen pt-28 pb-16 flex items-center justify-center relative overflow-hidden">
      
      {/* Background Ambient Radial Orbs */}
      <div className="absolute top-1/4 left-10 w-[30rem] h-[30rem] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[30rem] h-[30rem] bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Side (Desktop/Tablet): Healthcare AI Illustration & Floating Trust Cards */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block lg:col-span-6 space-y-6 text-left"
          >
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-accent text-xs font-semibold uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
              Enterprise Healthcare AI Workstation
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Intelligent Clinical Care & <span className="gradient-text">Digital Twin Portal</span>
            </h1>

            <p className="text-gray-300 text-base leading-relaxed max-w-xl">
              Access your role-tailored workstation to review live patient vital streams, RAG diagnostic suggestions, automated medical reports, and hospital resource analytics.
            </p>

            {/* Interactive Illustration */}
            <div className="py-2">
              <HealthcareIllustration />
            </div>

            {/* 4 Floating Glass Cards Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {authBadges.map((badge, idx) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={idx}
                    className="glass-card p-3.5 border border-white/10 flex items-center gap-3 bg-white/5 backdrop-blur-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        {badge.title}
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-[10px] text-gray-400">{badge.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Side: Auth Card Container */}
          <div className="lg:col-span-6 w-full flex justify-center">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
};
