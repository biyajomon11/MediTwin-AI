import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Stethoscope, User, Heart, ShieldCheck, Zap, Sparkles, Brain, Eye } from 'lucide-react';

export const HealthcareIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-2xl mx-auto flex items-center justify-center p-4">
      {/* Ambient Radial Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute top-1/4 right-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Center Container */}
      <div className="relative w-full glass-card p-6 md:p-8 rounded-3xl border border-white/15 overflow-hidden shadow-2xl">
        
        {/* Top Bar / Header of Mock AI Dashboard */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-navy-950 font-bold shadow-glow-accent">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-white text-sm">MediTwin Clinical AI Engine</h4>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
              </div>
              <p className="text-xs text-gray-400">Patient #94821 • Real-time Digital Twin Sync</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium bg-accent/15 text-accent rounded-full border border-accent/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Compliant
          </span>
        </div>

        {/* Central Graphic Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left Visual: Digital Twin & Doctor Interactive Graphic */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Visual Screen with Heartbeat ECG Animation */}
            <div className="relative bg-navy-950/80 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span className="flex items-center gap-1 text-accent font-medium">
                  <Activity className="w-4 h-4" /> Live ECG & Vital Stream
                </span>
                <span className="text-emerald-400">Normal Sinus Rhythm</span>
              </div>
              
              {/* ECG Wave Form SVG */}
              <div className="h-16 w-full flex items-center overflow-hidden">
                <svg className="w-full h-12 text-accent" viewBox="0 0 500 100" preserveAspectRatio="none">
                  <motion.path
                    d="M 0 50 L 80 50 L 90 20 L 100 80 L 110 10 L 120 90 L 130 50 L 220 50 L 230 20 L 240 80 L 250 10 L 260 90 L 270 50 L 360 50 L 370 20 L 380 80 L 390 10 L 400 90 L 410 50 L 500 50"
                    fill="transparent"
                    stroke="#38BDF8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathOffset: 0 }}
                    animate={{ pathOffset: [0, 1] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
                <div className="bg-white/5 p-2 rounded-xl">
                  <div className="text-[10px] text-gray-400">Heart Rate</div>
                  <div className="text-base font-bold text-white flex items-center justify-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-400 animate-heartbeat" /> 72 <span className="text-[10px] font-normal text-gray-400">bpm</span>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <div className="text-[10px] text-gray-400">Blood Pressure</div>
                  <div className="text-base font-bold text-white">120/80</div>
                </div>
                <div className="bg-white/5 p-2 rounded-xl">
                  <div className="text-[10px] text-gray-400">SpO2</div>
                  <div className="text-base font-bold text-accent">99%</div>
                </div>
              </div>
            </div>

            {/* AI Clinical Assistant Recommendation Card */}
            <div className="bg-gradient-to-r from-primary/30 to-secondary/30 p-3.5 rounded-2xl border border-primary/30 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/40 text-accent">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>AI Clinical Recommendation</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">99.4% Match</span>
                </div>
                <p className="text-gray-300 mt-1">
                  Digital twin simulation predicts optimal response to Therapy Plan B. No adverse drug interaction detected.
                </p>
              </div>
            </div>

          </div>

          {/* Right Visual: AI Neural Brain & Digital Twin Model */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              
              {/* Rotating Outer Ring */}
              <motion.div
                className="absolute inset-0 border-2 border-dashed border-accent/40 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              />

              {/* Counter Rotating Inner Ring */}
              <motion.div
                className="absolute inset-3 border border-primary-light/30 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              />

              {/* Digital Twin Hologram Silhouette Card */}
              <div className="relative z-10 w-28 h-28 rounded-2xl bg-gradient-to-b from-accent/20 to-primary/40 p-1 flex flex-col items-center justify-center border border-accent/50 shadow-glow-accent">
                <User className="w-12 h-12 text-accent" />
                <span className="text-[10px] font-bold tracking-wider text-white mt-1">DIGITAL TWIN</span>
                <span className="text-[9px] text-accent font-mono">ACTIVE MODEL</span>
              </div>
            </div>

            {/* Micro Badges */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-gray-300 flex items-center gap-1 border border-white/10">
                <Stethoscope className="w-3 h-3 text-primary-light" /> Dr. Sarah Miller
              </span>
              <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-gray-300 flex items-center gap-1 border border-white/10">
                <Zap className="w-3 h-3 text-amber-400" /> Real-time
              </span>
            </div>
          </div>
        </div>

        {/* Floating Card Badges (Absolute positioned over corner) */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-3 -right-3 sm:top-4 sm:right-4 bg-navy-900/90 backdrop-blur-xl p-3 rounded-2xl border border-accent/40 shadow-glow-accent flex items-center gap-2.5 z-20"
        >
          <div className="p-2 rounded-xl bg-accent/20 text-accent">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Multi-Agent AI</div>
            <div className="text-[10px] text-gray-300">RAG Knowledge Engine</div>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-3 -left-3 sm:bottom-4 sm:left-4 bg-navy-900/90 backdrop-blur-xl p-3 rounded-2xl border border-white/15 shadow-2xl flex items-center gap-2.5 z-20"
        >
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Hospital Insights</div>
            <div className="text-[10px] text-emerald-400 font-semibold">99.9% Accuracy</div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};
