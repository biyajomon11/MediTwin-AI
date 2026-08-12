import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { FeatureCard } from './FeatureCard';
import { Feature } from '../types';

export const Features: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const allFeatures: Feature[] = [
    {
      id: 'f1',
      iconName: 'Stethoscope',
      title: 'AI Clinical Decision Support',
      description: 'Instant evidence-based diagnostic recommendations, drug interaction checks, and patient risk stratification.',
      category: 'clinical',
    },
    {
      id: 'f2',
      iconName: 'Search',
      title: 'Medical Knowledge Search',
      description: 'RAG-powered intelligent neural search querying PubMed literature, guidelines, and internal hospital protocols.',
      category: 'clinical',
    },
    {
      id: 'f3',
      iconName: 'FileText',
      title: 'Patient Record Management',
      description: 'Unified longitudinal Electronic Health Records (EHR) with automated ICD-11 coding and OCR ingestion.',
      category: 'patient',
    },
    {
      id: 'f4',
      iconName: 'BarChart3',
      title: 'Hospital Analytics',
      description: 'Predictive bed capacity forecasting, emergency department bottleneck detection, and resource allocation.',
      category: 'administrative',
    },
    {
      id: 'f5',
      iconName: 'Calendar',
      title: 'Appointment Management',
      description: 'Smart scheduling with automated SMS/email reminders, no-show reduction AI, and physician calendar sync.',
      category: 'administrative',
    },
    {
      id: 'f6',
      iconName: 'ClipboardList',
      title: 'Medical Reports',
      description: 'Automated dictation transcription, radiology image summaries, and lab result interpretation.',
      category: 'clinical',
    },
    {
      id: 'f7',
      iconName: 'Users',
      title: 'Role-Based Dashboards',
      description: 'Tailored interfaces crafted specifically for Doctors, Nurses, Patients, and Hospital Administrators.',
      category: 'system',
    },
    {
      id: 'f8',
      iconName: 'Cpu',
      title: 'Digital Twin',
      description: 'Simulate patient organ function, drug metabolism, and therapeutic response prior to treatment execution.',
      category: 'clinical',
    },
    {
      id: 'f9',
      iconName: 'ShieldCheck',
      title: 'Secure Authentication',
      description: 'OAuth2, MFA, zero-trust RBAC, biometric login, and HIPAA/GDPR audit-logging built into every endpoint.',
      category: 'system',
    },
    {
      id: 'f10',
      iconName: 'Bell',
      title: 'Real-Time Notifications',
      description: 'Instant critical vital lab alerts, abnormal telemetry telemetry triggers, and emergency code broadcasts.',
      category: 'clinical',
    },
    {
      id: 'f11',
      iconName: 'PieChart',
      title: 'Interactive Analytics',
      description: 'Dynamic drill-down charts, operational financial metrics, and clinical outcome cohort comparisons.',
      category: 'administrative',
    },
    {
      id: 'f12',
      iconName: 'Bot',
      title: 'Future AI Medical Assistant',
      description: 'Conversational agent providing 24/7 post-discharge patient follow-up, symptom checks, and guidance.',
      category: 'patient',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Features' },
    { id: 'clinical', label: 'Clinical Support' },
    { id: 'administrative', label: 'Hospital Admin' },
    { id: 'patient', label: 'Patient Care' },
    { id: 'system', label: 'System & Security' },
  ];

  const filteredFeatures = activeCategory === 'all'
    ? allFeatures
    : allFeatures.filter(f => f.category === activeCategory);

  return (
    <section id="features" className="py-24 relative bg-navy-950/40">
      
      {/* Glow Orbs */}
      <div className="absolute top-1/3 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> Next-Generation Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Key Enterprise <span className="gradient-text">Features</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg">
            Empowering healthcare professionals with automated intelligence, seamless EHR workflows, and predictive digital twin insights.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-primary text-white shadow-glow-primary border border-primary-light/40'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredFeatures.map((feature, idx) => (
              <FeatureCard
                key={feature.id}
                iconName={feature.iconName}
                title={feature.title}
                description={feature.description}
                category={feature.category}
                delay={idx * 0.05}
              />
            ))}
          </AnimatePresence>
        </motion.div>

      </div>
    </section>
  );
};
