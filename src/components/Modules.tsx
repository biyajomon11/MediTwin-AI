import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, CheckCircle2, Activity } from 'lucide-react';
import { ModuleCard } from './ModuleCard';
import { ModuleRole } from '../types';
import { Button } from './Button';

export const Modules: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<ModuleRole | null>(null);

  const modules: ModuleRole[] = [
    {
      id: 'doctor',
      role: 'Doctor',
      title: 'Clinical Decision & Triage',
      icon: 'Stethoscope',
      badge: 'Physician Workstation',
      description: 'Streamline diagnosis with real-time AI differential suggestions, RAG medical search, and automated prescription generation.',
      features: [
        'Patient Records (EHR / Longitudinal Data)',
        'Appointments & Telehealth Consultations',
        'AI Assisted Prescriptions & Interactions',
        'Automated Medical Reports & Imaging Summaries',
        'Doctor Dashboard Preview & Analytics'
      ],
      previewMetrics: [
        { label: 'Diagnostic Speed', value: '+45%' },
        { label: 'Documentation Time', value: '-60%' }
      ]
    },
    {
      id: 'nurse',
      role: 'Nurse',
      title: 'Patient Care & Medication',
      icon: 'HeartPulse',
      badge: 'Ward & Nursing Portal',
      description: 'Track assigned ward beds, automated medicine administration alerts, treatment schedule timelines, and nursing observation logs.',
      features: [
        'Assigned Patients & Bed Monitoring',
        'Automated Medicine Reminders & Dosage Alerts',
        'Treatment Schedule & Nursing Notes',
        'Vital Observations & Telemetry Warnings'
      ],
      previewMetrics: [
        { label: 'Medication Accuracy', value: '99.8%' },
        { label: 'Shift Handover', value: '10 mins' }
      ]
    },
    {
      id: 'patient',
      role: 'Patient',
      title: 'Personal Health Portal',
      icon: 'User',
      badge: 'Patient Companion',
      description: 'Empower patients with 24/7 access to their medical records, lab reports, AI health summary, and easy appointment booking.',
      features: [
        'Complete Medical History & Immunizations',
        'Direct Appointment Booking & Reminders',
        'AI Powered Plain-Language Health Summary',
        'Diagnostic Reports & Prescription Refills'
      ],
      previewMetrics: [
        { label: 'Patient Satisfaction', value: '98%' },
        { label: 'Wait Time Reduction', value: '35 mins' }
      ]
    },
    {
      id: 'hospital-admin',
      role: 'Hospital Administrator',
      title: 'Operations & Resource Planning',
      icon: 'Building',
      badge: 'Executive Dashboard',
      description: 'Gain panoramic operational visibility over department efficiency, bed capacity, physician workload, and financial analytics.',
      features: [
        'Hospital Analytics & Bed Occupancy Rate',
        'Departments & Resource Management',
        'Doctor & Nursing Staff Rostering',
        'Patient Flow & Billing Financial Reports'
      ],
      previewMetrics: [
        { label: 'Facility Efficiency', value: '+30%' },
        { label: 'Resource Utilization', value: '94%' }
      ]
    },
    {
      id: 'system-admin',
      role: 'System Administrator',
      title: 'Security & Infrastructure',
      icon: 'ShieldCheck',
      badge: 'Security Operations',
      description: 'Enterprise IT control panel with real-time server health monitoring, zero-trust RBAC permissions, and immutable audit logging.',
      features: [
        'Server Monitoring & Microservice Telemetry',
        'Zero-Trust Security & Multi-Factor Auth',
        'Immutable HIPAA Audit Logs & Compliance',
        'Encrypted Database Replication & Backup'
      ],
      previewMetrics: [
        { label: 'System Availability', value: '99.99%' },
        { label: 'Security Score', value: 'A+' }
      ]
    }
  ];

  return (
    <section id="modules" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-accent text-xs font-semibold uppercase tracking-wider">
            <Users className="w-4 h-4" /> Role-Based Access Control
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Tailored Role <span className="gradient-text">Modules</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg">
            Custom-tailored, security-scoped dashboards optimized specifically for every participant in the healthcare ecosystem.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <ModuleCard key={mod.id} module={mod} onSelect={setSelectedModule} />
          ))}
        </div>

      </div>

      {/* Role Module Detail Modal */}
      <AnimatePresence>
        {selectedModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card max-w-2xl w-full p-6 sm:p-8 relative border border-accent/40 shadow-2xl bg-navy-900/95 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedModule(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-accent/20 text-accent font-semibold text-xs border border-accent/40">
                  {selectedModule.badge}
                </span>
                <h3 className="text-2xl font-bold text-white">{selectedModule.role} Module</h3>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                {selectedModule.description}
              </p>

              {/* Detailed Feature List */}
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider text-accent">Key Included Features & Capabilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedModule.features.map((feat, idx) => (
                    <div key={idx} className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-200">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Mock Dashboard Preview Box */}
              <div className="bg-navy-950 p-4 rounded-2xl border border-white/15 space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs text-gray-400 border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1.5 text-accent font-semibold">
                    <Activity className="w-4 h-4" /> Live Interface Preview
                  </span>
                  <span className="text-emerald-400 text-[10px]">Connected & Authorized</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedModule.previewMetrics.map((m, idx) => (
                    <div key={idx} className="bg-white/5 p-3 rounded-xl text-center border border-white/10">
                      <div className="text-lg font-black text-white">{m.value}</div>
                      <div className="text-[10px] text-gray-400">{m.label}</div>
                    </div>
                  ))}
                  <div className="bg-primary/20 p-3 rounded-xl text-center border border-primary/40 col-span-2 sm:col-span-1">
                    <div className="text-lg font-black text-accent">100%</div>
                    <div className="text-[10px] text-gray-300">HIPAA Compliant</div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedModule(null)}>
                  Close Preview
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => {
                    setSelectedModule(null);
                    const el = document.getElementById('contact');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Request Role Demo
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
