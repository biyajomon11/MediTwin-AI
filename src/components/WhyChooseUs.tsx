import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ShieldCheck, Zap, Server, Lock, Rocket, Award, CheckCircle } from 'lucide-react';
import { WhyChooseItem } from '../types';

export const WhyChooseUs: React.FC = () => {
  const cards: WhyChooseItem[] = [
    {
      title: 'AI Powered Decision Making',
      description: 'Augment physicians with diagnostic algorithms validated on millions of de-identified clinical records for 98%+ precision.',
      icon: 'Brain',
      highlight: '98% Diagnostic Precision',
    },
    {
      title: 'Secure Architecture',
      description: 'Zero-knowledge encryption, HIPAA & GDPR compliance, automated vulnerability scanning, and isolated patient data vaults.',
      icon: 'ShieldCheck',
      highlight: 'HIPAA & GDPR Certified',
    },
    {
      title: 'Fast Performance',
      description: 'Sub-50ms query response time powered by optimized vector indexing and ultra-low latency real-time websockets.',
      icon: 'Zap',
      highlight: '< 50ms Real-Time Sync',
    },
    {
      title: 'Enterprise Scalability',
      description: 'Multi-tenant cloud architecture handling over 100,000+ daily concurrent hospital interactions without degradation.',
      icon: 'Server',
      highlight: '100k+ Daily Interactions',
    },
    {
      title: 'Role-Based Access',
      description: 'Granular role permissions for Doctors, Nurses, Patients, and Administrators preventing unauthorized data exposure.',
      icon: 'Lock',
      highlight: 'Zero-Trust Granular RBAC',
    },
    {
      title: 'Future Ready Platform',
      description: 'Built for continuous integration of wearable IoT telemetry, genomic variant analysis, and autonomous medical agents.',
      icon: 'Rocket',
      highlight: 'IoT & Genomics Ready',
    },
  ];

  const getCardIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return <Brain className="w-6 h-6 text-accent" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-emerald-400" />;
      case 'Zap': return <Zap className="w-6 h-6 text-amber-400" />;
      case 'Server': return <Server className="w-6 h-6 text-purple-400" />;
      case 'Lock': return <Lock className="w-6 h-6 text-rose-400" />;
      case 'Rocket': return <Rocket className="w-6 h-6 text-primary-light" />;
      default: return <Award className="w-6 h-6 text-accent" />;
    }
  };

  return (
    <section id="why-us" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-semibold uppercase tracking-wider">
            <Award className="w-4 h-4" /> Enterprise Differentiators
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Why Choose <span className="gradient-text">MediTwin AI</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg">
            Engineered specifically to solve complex hospital bottlenecks with unmatched security, speed, and intelligence.
          </p>
        </div>

        {/* 6 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="glass-card-interactive p-6 flex flex-col justify-between border border-white/10 relative overflow-hidden group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shadow-glass group-hover:border-accent/40 transition-colors">
                    {getCardIcon(card.icon)}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-accent transition-colors">
                  {card.title}
                </h3>

                <p className="text-sm text-gray-300 leading-relaxed font-normal">
                  {card.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 text-xs font-semibold text-accent flex items-center justify-between">
                <span>{card.highlight}</span>
                <span className="text-gray-400 font-normal">SaaS Standard</span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
