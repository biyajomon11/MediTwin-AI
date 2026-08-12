import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, Layers, Zap, BrainCircuit, Database, Server, LineChart } from 'lucide-react';

export const About: React.FC = () => {
  const aboutCards = [
    {
      title: 'AI Powered',
      icon: Cpu,
      description: 'Driven by state-of-the-art LLMs and Multi-Agent Orchestration to deliver diagnostic clarity and intelligent triage.',
      badge: 'Multi-Agent',
      gradient: 'from-blue-500/20 to-accent/20',
      borderColor: 'border-accent/40',
    },
    {
      title: 'Secure',
      icon: ShieldCheck,
      description: 'End-to-end encrypted architecture meeting HIPAA, GDPR, and ISO 27001 healthcare data governance standards.',
      badge: 'HIPAA Ready',
      gradient: 'from-emerald-500/20 to-teal-500/20',
      borderColor: 'border-emerald-500/40',
    },
    {
      title: 'Scalable',
      icon: Layers,
      description: 'Seamlessly connects single clinics or multi-hospital networks with zero-latency data synchronization.',
      badge: 'Cloud Native',
      gradient: 'from-indigo-500/20 to-purple-500/20',
      borderColor: 'border-indigo-500/40',
    },
    {
      title: 'Real-Time Insights',
      icon: Zap,
      description: 'Instant clinical analytics, automated medical reporting, and predictive patient monitoring powered by digital twins.',
      badge: '< 50ms Latency',
      gradient: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/40',
    },
  ];

  return (
    <section id="about" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-semibold uppercase tracking-wider">
            <BrainCircuit className="w-4 h-4" /> Discover Our Vision
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            About <span className="gradient-text">MediTwin AI</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed">
            MediTwin AI revolutionizes healthcare administration and patient care by integrating cutting-edge Artificial Intelligence, Retrieval-Augmented Generation (RAG), autonomous Multi-Agent Systems, and enterprise-grade secure hospital workflows.
          </p>
        </div>

        {/* Technical Architecture Highlight Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card p-6 md:p-8 mb-16 border border-white/15 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="p-4 space-y-2">
              <Database className="w-8 h-8 text-accent mx-auto" />
              <h4 className="text-lg font-bold text-white">Healthcare RAG Engine</h4>
              <p className="text-xs text-gray-300">
                Queries PubMed, clinical guidelines, and hospital EHRs safely without data hallucination.
              </p>
            </div>
            <div className="p-4 space-y-2 pt-6 md:pt-4">
              <Server className="w-8 h-8 text-primary-light mx-auto" />
              <h4 className="text-lg font-bold text-white">Multi-Agent Swarm</h4>
              <p className="text-xs text-gray-300">
                Dedicated AI subagents coordinate diagnosis, billing, pharmacy, and bed scheduling.
              </p>
            </div>
            <div className="p-4 space-y-2 pt-6 md:pt-4">
              <LineChart className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-lg font-bold text-white">Digital Twin Simulations</h4>
              <p className="text-xs text-gray-300">
                Simulates treatment responses and physiological trends in real time.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {aboutCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`glass-card-interactive p-6 flex flex-col justify-between border ${card.borderColor} bg-gradient-to-b ${card.gradient}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shadow-glass">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/15">
                      {card.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{card.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
