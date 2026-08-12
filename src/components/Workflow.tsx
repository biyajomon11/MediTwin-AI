import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, CalendarCheck, Stethoscope, BrainCircuit, Pill, Activity, FileSpreadsheet, HeartHandshake, GitCommit } from 'lucide-react';
import { WorkflowStep } from '../types';

export const Workflow: React.FC = () => {
  const steps: WorkflowStep[] = [
    {
      step: 1,
      title: 'Patient Registration',
      description: 'Instant digital intake with biometric verification, insurance clearance, and EHR profile generation.',
      icon: 'UserPlus',
      actor: 'Patient & Front Desk',
    },
    {
      step: 2,
      title: 'Appointment Booking',
      description: 'Smart AI triage matches patient symptoms with available specialist slots and room schedules.',
      icon: 'CalendarCheck',
      actor: 'AI Scheduling Engine',
    },
    {
      step: 3,
      title: 'Doctor Consultation',
      description: 'Physician reviews real-time vital telemetry, medical history, and clinical notes in the unified portal.',
      icon: 'Stethoscope',
      actor: 'Attending Physician',
    },
    {
      step: 4,
      title: 'AI Clinical Assistance',
      description: 'RAG Multi-Agent system performs differential diagnosis checks, drug interaction scans, and digital twin modeling.',
      icon: 'BrainCircuit',
      actor: 'MediTwin Multi-Agent AI',
    },
    {
      step: 5,
      title: 'Prescription',
      description: 'Electronic e-Prescribing sent directly to the hospital pharmacy with automated dosage verification.',
      icon: 'Pill',
      actor: 'Doctor & Pharmacy',
    },
    {
      step: 6,
      title: 'Treatment',
      description: 'Inpatient and outpatient care execution supported by nurse task alerts and digital twin outcome tracking.',
      icon: 'Activity',
      actor: 'Nursing Staff & Specialist',
    },
    {
      step: 7,
      title: 'Reports',
      description: 'Automated dictation translation, radiology lab summary generation, and billing coding.',
      icon: 'FileSpreadsheet',
      actor: 'AI Reporting Subagent',
    },
    {
      step: 8,
      title: 'Patient Follow-up',
      description: 'Post-discharge conversational AI checks recovery progress, medication adherence, and schedules follow-ups.',
      icon: 'HeartHandshake',
      actor: 'MediTwin Follow-up Agent',
    },
  ];

  const getStepIcon = (iconName: string) => {
    switch (iconName) {
      case 'UserPlus': return <UserPlus className="w-6 h-6 text-accent" />;
      case 'CalendarCheck': return <CalendarCheck className="w-6 h-6 text-primary-light" />;
      case 'Stethoscope': return <Stethoscope className="w-6 h-6 text-emerald-400" />;
      case 'BrainCircuit': return <BrainCircuit className="w-6 h-6 text-purple-400 animate-pulse" />;
      case 'Pill': return <Pill className="w-6 h-6 text-amber-400" />;
      case 'Activity': return <Activity className="w-6 h-6 text-rose-400" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-6 h-6 text-blue-400" />;
      case 'HeartHandshake': return <HeartHandshake className="w-6 h-6 text-teal-300" />;
      default: return <GitCommit className="w-6 h-6 text-accent" />;
    }
  };

  return (
    <section id="workflow" className="py-24 relative bg-navy-950/60">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-wider">
            <GitCommit className="w-4 h-4" /> End-to-End Care Lifecycle
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Seamless Hospital <span className="gradient-text">Workflow</span>
          </h2>
          <p className="text-gray-300 text-base sm:text-lg">
            From intake to post-discharge care, MediTwin AI coordinates every step in the clinical continuum.
          </p>
        </div>

        {/* Timeline Grid (Alternate Layout for Desktop, Single Column for Mobile) */}
        <div className="relative">
          
          {/* Vertical Connecting Glow Line (Desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-4 bottom-4 w-1 -translate-x-1/2 bg-gradient-to-b from-primary via-accent to-emerald-400 opacity-30 rounded-full" />

          <div className="space-y-12 lg:space-y-16">
            {steps.map((step, index) => {
              const isEven = index % 2 === 0;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                  className={`flex flex-col lg:flex-row items-center ${
                    isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  } gap-8`}
                >
                  {/* Step Card Content */}
                  <div className="w-full lg:w-1/2">
                    <div className={`glass-card-interactive p-6 sm:p-8 border border-white/15 relative overflow-hidden ${
                      isEven ? 'lg:mr-6' : 'lg:ml-6'
                    }`}>
                      {/* Step Number Background Badge */}
                      <span className="absolute top-4 right-4 text-4xl font-black text-white/5 select-none font-mono">
                        0{step.step}
                      </span>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shadow-glass">
                          {getStepIcon(step.icon)}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2.5 py-0.5 rounded-full border border-accent/30">
                            Step {step.step} • {step.actor}
                          </span>
                          <h3 className="text-xl font-bold text-white mt-1">{step.title}</h3>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 leading-relaxed font-normal">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Center Timeline Indicator Circle */}
                  <div className="relative flex items-center justify-center flex-shrink-0 z-20">
                    <div className="w-12 h-12 rounded-full bg-navy-950 border-2 border-accent flex items-center justify-center text-accent font-bold shadow-glow-accent">
                      {step.step}
                    </div>
                  </div>

                  {/* Empty Spacer Column for Desktop Grid Alignment */}
                  <div className="hidden lg:block w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
