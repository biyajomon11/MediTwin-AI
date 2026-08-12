import React from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Building2, Users, Calendar, Target, ShieldCheck, Activity } from 'lucide-react';
import { StatItem } from '../types';

export const Statistics: React.FC = () => {
  const stats: StatItem[] = [
    {
      id: 'doctors',
      label: 'Doctors Engaged',
      value: '100+',
      numericTarget: 100,
      icon: 'Stethoscope',
      description: 'Certified medical specialists using AI triage daily',
    },
    {
      id: 'hospitals',
      label: 'Hospitals Deployed',
      value: '50+',
      numericTarget: 50,
      icon: 'Building2',
      description: 'Major medical centers and clinical networks',
    },
    {
      id: 'patients',
      label: 'Patients Served',
      value: '25,000+',
      numericTarget: 25000,
      icon: 'Users',
      description: 'Active digital twin patient profiles managed',
    },
    {
      id: 'appointments',
      label: 'Appointments Processed',
      value: '100,000+',
      numericTarget: 100000,
      icon: 'Calendar',
      description: 'Seamless automated bookings & follow-ups',
    },
    {
      id: 'accuracy',
      label: 'Diagnostic Accuracy',
      value: '98%',
      numericTarget: 98,
      icon: 'Target',
      description: 'Validated RAG clinical decision precision',
    },
    {
      id: 'uptime',
      label: 'System Uptime SLA',
      value: '99.9%',
      numericTarget: 99.9,
      icon: 'ShieldCheck',
      description: '24/7 mission-critical high availability',
    },
  ];

  const getStatIcon = (iconName: string) => {
    switch (iconName) {
      case 'Stethoscope': return <Stethoscope className="w-6 h-6 text-accent" />;
      case 'Building2': return <Building2 className="w-6 h-6 text-primary-light" />;
      case 'Users': return <Users className="w-6 h-6 text-emerald-400" />;
      case 'Calendar': return <Calendar className="w-6 h-6 text-purple-400" />;
      case 'Target': return <Target className="w-6 h-6 text-amber-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-teal-300" />;
      default: return <Activity className="w-6 h-6 text-accent" />;
    }
  };

  return (
    <section className="py-20 relative bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border-y border-white/10">
      
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Proven Performance & Healthcare <span className="gradient-text">Impact</span>
          </h2>
          <p className="text-sm text-gray-300 mt-2">
            Delivering trusted results for healthcare providers, administrators, and patients worldwide.
          </p>
        </div>

        {/* 6 Grid Counters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
              className="glass-card p-5 text-center flex flex-col justify-between border border-white/10 hover:border-accent/40 shadow-glass"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3 border border-white/10">
                {getStatIcon(stat.icon)}
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight gradient-text">
                  {stat.value}
                </div>
                <div className="text-xs font-bold text-white mt-1">{stat.label}</div>
                <div className="text-[10px] text-gray-400 mt-1 leading-tight">{stat.description}</div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
