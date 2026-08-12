import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Network, Building2, ArrowRight, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { HealthcareIllustration } from './HealthcareIllustration';

interface HeroProps {
  onOpenRegister: () => void;
  onExploreFeatures: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenRegister, onExploreFeatures }) => {
  const trustBadges = [
    { label: 'Secure Platform', icon: ShieldCheck },
    { label: 'AI Powered', icon: Cpu },
    { label: 'Multi-Agent System', icon: Network },
    { label: 'Enterprise Ready', icon: Building2 },
  ];

  return (
    <section id="home" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-[30rem] h-[30rem] bg-accent/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Side Column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            
            {/* Top Pill Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-glass">
              <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Next-Gen Enterprise SaaS</span>
              <span className="text-xs text-gray-300">| Healthcare AI Digital Twin</span>
            </div>

            {/* Large Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
              Transforming Healthcare Through{' '}
              <span className="gradient-text">Artificial Intelligence</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-300 font-normal leading-relaxed max-w-2xl">
              Empowering hospitals with intelligent clinical decision support, hospital knowledge management, patient care, and AI-driven workflows.
            </p>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onOpenRegister}
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                Get Started
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={onExploreFeatures}
                icon={<Play className="w-4 h-4 fill-accent text-accent" />}
              >
                Explore Features
              </Button>
            </div>

            {/* Small Trust Badges Grid */}
            <div className="pt-8 border-t border-white/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> Enterprise Trust & Compliance Standard
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {trustBadges.map((badge, idx) => {
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-xs font-medium text-gray-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      <span>{badge.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>

          {/* Right Side Column: Modern Healthcare AI Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6"
          >
            <HealthcareIllustration />
          </motion.div>

        </div>
      </div>
    </section>
  );
};
