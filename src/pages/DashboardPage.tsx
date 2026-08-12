import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, HeartPulse, User, Building, ShieldCheck, Activity, LogOut, CheckCircle2, ChevronRight, Brain, Database } from 'lucide-react';
import { Button } from '../components/Button';

export const DashboardPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const activeRole = role || 'doctor';

  const roleConfigs: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; badge: string; metrics: { label: string; value: string; change: string }[]; actions: string[] }> = {
    doctor: {
      title: 'Doctor Clinical Workstation',
      subtitle: 'Attending Physician: Dr. Sarah Miller, MD (Cardiology)',
      icon: Stethoscope,
      badge: 'Physician Workstation',
      metrics: [
        { label: 'Assigned Patients', value: '18', change: '3 urgent triage' },
        { label: 'AI RAG Queries Today', value: '42', change: '99.4% accuracy' },
        { label: 'EHR Reports Ready', value: '12', change: '2 pending sign-off' },
        { label: 'Digital Twin Simulations', value: '5', change: 'Therapy Response +18%' },
      ],
      actions: ['Review Patient EHR', 'Run AI Digital Twin Simulation', 'Generate E-Prescription', 'Search PubMed RAG Guidelines'],
    },
    nurse: {
      title: 'Nurse Ward Care Portal',
      subtitle: 'Head Nurse: Elena Rostova, RN (ICU Unit 4)',
      icon: HeartPulse,
      badge: 'Nursing Workstation',
      metrics: [
        { label: 'Assigned Ward Beds', value: '12', change: 'All vitals normal' },
        { label: 'Medication Doses Due', value: '8', change: 'Next in 15 mins' },
        { label: 'Shift Handover Notes', value: 'Completed', change: '100% verified' },
        { label: 'Telemetry Alerts', value: '0 Active', change: 'All clear' },
      ],
      actions: ['Record Patient Vitals', 'Log Medication Administered', 'Update Shift Handover', 'Request Physician Triage'],
    },
    patient: {
      title: 'Patient Health Companion',
      subtitle: 'Patient: Marcus Vance (ID #94821)',
      icon: User,
      badge: 'Personal Health Portal',
      metrics: [
        { label: 'Latest Heart Rate', value: '72 bpm', change: 'Normal' },
        { label: 'Blood Pressure', value: '120/80', change: 'Optimal' },
        { label: 'Upcoming Consult', value: 'Tomorrow 10 AM', change: 'Dr. Sarah Miller' },
        { label: 'AI Health Summary', value: 'Updated Today', change: 'No risk flags' },
      ],
      actions: ['View Lab Results', 'Book Doctor Appointment', 'Request Prescription Refill', 'Ask AI Health Assistant'],
    },
    'hospital-admin': {
      title: 'Hospital Executive Analytics',
      subtitle: 'Chief Operating Officer: Metropolitan General Hospital',
      icon: Building,
      badge: 'Executive Dashboard',
      metrics: [
        { label: 'Bed Occupancy Rate', value: '94%', change: '+3% efficiency' },
        { label: 'Daily ER Throughput', value: '340 Patients', change: 'Avg wait 14 mins' },
        { label: 'Physician Utilization', value: '91%', change: 'Optimal rostering' },
        { label: 'HIPAA Compliance Index', value: '100%', change: 'Audit passed' },
      ],
      actions: ['View Department Analytics', 'Manage Staff Rosters', 'Generate Operational Reports', 'Audit Facility Resource Usage'],
    },
    'system-admin': {
      title: 'System Security Operations',
      subtitle: 'Lead Infrastructure Engineer: Zero-Trust Ops',
      icon: ShieldCheck,
      badge: 'Security Control Panel',
      metrics: [
        { label: 'Server Availability', value: '99.99%', change: 'Zero downtime' },
        { label: 'Microservice Latency', value: '38 ms', change: 'Sub-50ms SLA' },
        { label: 'HIPAA Audit Logs', value: 'Immutable', change: '1.2M events' },
        { label: 'Security Threat Score', value: 'A+ (0 Vulnerabilities)', change: 'Shield Active' },
      ],
      actions: ['Inspect Live Audit Logs', 'Manage User Roles & MFA', 'Monitor Microservice Health', 'Run Automated Vulnerability Scan'],
    },
  };

  const config = roleConfigs[activeRole] || roleConfigs.doctor;
  const RoleIcon = config.icon;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans">
      
      {/* Top Workstation Header Bar */}
      <header className="glass-nav py-4 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-primary">
              <div className="w-full h-full bg-navy-950 rounded-[14px] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-accent" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold text-white">MediTwin <span className="text-accent">AI</span></span>
              <span className="text-[10px] text-gray-400 block -mt-1">Authenticated Workstation</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-gray-300">
              <RoleIcon className="w-4 h-4 text-accent" />
              <span className="font-semibold text-white uppercase">{activeRole.replace('-', ' ')}</span>
            </div>

            <Link to="/database">
              <Button variant="glass" size="sm" icon={<Database className="w-4 h-4 text-accent" />}>
                Database View
              </Button>
            </Link>

            <Link to="/login">
              <Button variant="outline" size="sm" icon={<LogOut className="w-4 h-4" />}>
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Banner Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 border border-accent/40 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-glow-primary flex-shrink-0">
                <RoleIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold border border-accent/40">
                    {config.badge}
                  </span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> HIPAA Authorized
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{config.title}</h1>
                <p className="text-xs sm:text-sm text-gray-300">{config.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link to="/database">
                <Button variant="primary" size="sm" icon={<Database className="w-4 h-4" />}>
                  View Live Database
                </Button>
              </Link>
              <Link to="/">
                <Button variant="glass" size="sm">
                  Return to Landing Page
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {config.metrics.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card-interactive p-5 border border-white/10 text-left flex flex-col justify-between"
            >
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{m.label}</div>
              <div className="text-2xl font-black text-white mt-2 gradient-text">{m.value}</div>
              <div className="text-[11px] text-accent mt-2 font-medium flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> {m.change}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Role Quick Actions Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white text-left flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent" /> Workstation Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {config.actions.map((act, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => alert(`Launching action: "${act}"`)}
                className="glass-card-interactive p-4 border border-white/10 text-left flex items-center justify-between text-xs font-bold text-white hover:text-accent cursor-pointer group"
              >
                <span>{act}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-accent transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};
