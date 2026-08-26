import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, HeartPulse, User, Building, ShieldCheck, Activity,
  LogOut, CheckCircle2, ChevronRight, ChevronDown, Brain, ClipboardList,
  LayoutDashboard, Menu, X, Users, BookOpen,
  Calendar, Pill, FlaskConical, AlertTriangle, Clock,
  ClipboardEdit, HeartHandshake, Bell, Layers, FileText, BarChart3, Building2, FolderOpen,
} from 'lucide-react';
import { Button } from '../components/Button';
import { NurseObservationsPage } from './NurseObservationsPage';
import { NursingNotesPage } from './nurse/NursingNotesPage';
import { PatientMedicalHistoryPage } from './nurse/PatientMedicalHistoryPage';
import { PatientRecordsPage } from './doctor/PatientRecordsPage';
import { AIPatientSummaryPage } from './doctor/AIPatientSummaryPage';
import { ClinicalGuidelinesPage } from './doctor/ClinicalGuidelinesPage';
import { MedicalDocumentsPage } from './patient/MedicalDocumentsPage';
import { PrescriptionsPage } from './patient/PrescriptionsPage';
import { MedicalHistoryPage } from './patient/MedicalHistoryPage';
import { HealthProfilePage } from './patient/HealthProfilePage';
import { MedicineRemindersPage } from './patient/MedicineRemindersPage';
import { NotificationsPage } from './patient/NotificationsPage';
import { HospitalNotificationsPage } from './hospitalAdmin/HospitalNotificationsPage';
import { HospitalReportsPage } from './hospitalAdmin/HospitalReportsPage';
import { HospitalActivityPage } from './hospitalAdmin/HospitalActivityPage';
import * as patientService from '../services/patientService';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  hasSubmenu?: boolean;
}

const HOSPITAL_ADMIN_NAV: NavItem[] = [
  { id: 'dashboard',      label: 'Executive Dashboard',        icon: LayoutDashboard },
  { id: 'notifications',  label: 'Hospital Notifications',     icon: Bell            },
  { id: 'reports',        label: 'Hospital Reports & Stats',   icon: BarChart3       },
  { id: 'activities',     label: 'Hospital Activity Monitor',  icon: Activity        },
  { id: 'departments',    label: 'Department Analytics',       icon: Building2, comingSoon: true },
  { id: 'staff-rosters',  label: 'Staff Rosters',              icon: Users,     comingSoon: true },
  { id: 'profile',        label: 'Administrator Profile',      icon: User,      comingSoon: true },
];

const PATIENT_NAV: NavItem[] = [
  { id: 'dashboard',         label: 'Health Dashboard',      icon: LayoutDashboard },
  { id: 'profile',           label: 'My Health Profile',     icon: User            },
  { id: 'medical-history',   label: 'Medical History',       icon: HeartPulse      },
  { id: 'prescriptions',     label: 'My Prescriptions',      icon: Pill            },
  { id: 'documents',         label: 'Medical Documents',     icon: FileText        },
  { id: 'reminders',         label: 'Medicine Reminders',    icon: Clock           },
  { id: 'notifications',     label: 'Notifications',         icon: Bell            },
  { id: 'appointments',      label: 'Appointments',          icon: Calendar, comingSoon: true },
  { id: 'ai-health-summary', label: 'AI Health Summary',     icon: Brain,    comingSoon: true },
];

const NURSE_NAV: NavItem[] = [
  { id: 'dashboard',        label: 'Nurse Dashboard',                    icon: LayoutDashboard },
  { id: 'observations',     label: 'Patient Observations & Vital Signs', icon: ClipboardList   },
  { id: 'nursing-notes',    label: 'Nursing Notes & Treatment Records',  icon: ClipboardEdit   },
  { id: 'medical-history',  label: 'Patient Medical History',            icon: HeartHandshake  },
  { id: 'treatment-plans',  label: 'Treatment Plans',                    icon: Layers          },
  { id: 'medicine-reminders', label: 'Medicine Reminders',              icon: Bell,     comingSoon: true },
  { id: 'hospital-procedures', label: 'Hospital Procedures',            icon: BookOpen, comingSoon: true },
  { id: 'profile',          label: 'Profile',                            icon: User,     comingSoon: true },
];

const PATIENT_RECORD_SUBITEMS = [
  { id: 'overview',      label: 'Overview',              icon: User         },
  { id: 'labs',          label: 'Lab Reports',           icon: FlaskConical },
  { id: 'appointments',  label: 'Appointments',          icon: Calendar     },
  { id: 'prescriptions', label: 'Prescriptions',         icon: Pill         },
  { id: 'notes',         label: 'Clinical Notes',        icon: FileText     },
  { id: 'documents',     label: 'Medical Documents',     icon: FolderOpen   },
];

const DOCTOR_NAV: NavItem[] = [
  { id: 'dashboard',         label: 'Dashboard',            icon: LayoutDashboard },
  { id: 'patient-records',   label: 'Patient Records',      icon: Users, hasSubmenu: true },
  { id: 'ai-summaries',      label: 'AI Patient Summaries', icon: Brain            },
  { id: 'medical-history',   label: 'Medical History',      icon: HeartPulse       },
  { id: 'guidelines',        label: 'Clinical Guidelines',  icon: BookOpen         },
  { id: 'profile',           label: 'Profile',              icon: User,       comingSoon: true },
];

// ─────────────────────────────────────────────────────────────────
// Coming Soon placeholder
// ─────────────────────────────────────────────────────────────────
const ComingSoonView: React.FC<{ label: string }> = ({ label }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4"
  >
    <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
      <Clock className="w-8 h-8 text-accent" />
    </div>
    <h2 className="text-2xl font-bold text-white">{label}</h2>
    <p className="text-gray-400 max-w-sm">
      This module is under development and will be available in a future release.
    </p>
    <span className="px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold">
      Coming Soon
    </span>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────
// Access Denied
// ─────────────────────────────────────────────────────────────────
const AccessDenied: React.FC<{ redirectTo: string; roleName?: string }> = ({ redirectTo, roleName = 'Authorized' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-center space-y-5 p-8"
  >
    <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
      <AlertTriangle className="w-10 h-10 text-rose-400" />
    </div>
    <h1 className="text-3xl font-extrabold text-white">Access Denied</h1>
    <p className="text-gray-300 max-w-md">
      You are not authorized to access the {roleName} Dashboard. Only authenticated users with the {roleName} role may access this area.
    </p>
    <Link to={redirectTo}>
      <Button variant="primary">Go to My Dashboard</Button>
    </Link>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const activeRole = role || 'doctor';

  const [activeView, setActiveView] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [doctorRecordTab, setDoctorRecordTab] = useState<string>('overview');
  const [patientRecordsExpanded, setPatientRecordsExpanded] = useState<boolean>(true);

  // ── Read the verified session role (source of truth) ──────────
  const storedUser = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem('meditwin_user') || 'null') ||
        JSON.parse(sessionStorage.getItem('meditwin_user') || 'null') ||
        {}
      );
    } catch { return {}; }
  })();

  const localUsers = (() => {
    try {
      return JSON.parse(localStorage.getItem('meditwin_registered_users') || '[]');
    } catch { return []; }
  })();

  const matchingLocalUser = localUsers.find((u: any) =>
    (storedUser.email && u.email?.toLowerCase() === storedUser.email.toLowerCase()) ||
    (storedUser.username && u.username?.toLowerCase() === storedUser.username.toLowerCase()) ||
    (storedUser.userId && u.id === storedUser.userId) ||
    (storedUser.id && u.id === storedUser.id) ||
    (storedUser.firstName && u.firstName?.toLowerCase() === storedUser.firstName.toLowerCase())
  );

  const firstName = storedUser.firstName || matchingLocalUser?.firstName || '';
  const lastName = storedUser.lastName || matchingLocalUser?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  // The verified role from the JWT session — NOT from the URL param
  const verifiedRole: string = storedUser.role || '';
  const loggedInEmail: string = storedUser.email || storedUser.username || '';

  const rawDisplayName = fullName || (loggedInEmail.includes('@') ? loggedInEmail.split('@')[0] : loggedInEmail);
  const displayName = rawDisplayName
    ? rawDisplayName.charAt(0).toUpperCase() + rawDisplayName.slice(1)
    : 'User';

  const isNurse   = activeRole === 'nurse';
  const isDoctor  = activeRole === 'doctor';
  const isPatient = activeRole === 'patient';
  const isAdmin   = activeRole === 'admin' || activeRole === 'hospital-admin';

  // Load unread notification count for patient
  useEffect(() => {
    if (isPatient) {
      patientService.getNotifications().then((notifs) => {
        setUnreadCount(notifs.filter((n) => !n.isRead).length);
      }).catch(() => {});
    }
  }, [isPatient, activeView]);

  // ── Role guard ───────
  if (activeRole === 'doctor' && verifiedRole !== 'doctor') {
    const redirectTarget = verifiedRole ? `/dashboard/${verifiedRole}` : '/login';
    return <AccessDenied redirectTo={redirectTarget} roleName="Doctor" />;
  }
  if (activeRole === 'patient' && verifiedRole && verifiedRole !== 'patient') {
    const redirectTarget = `/dashboard/${verifiedRole}`;
    return <AccessDenied redirectTo={redirectTarget} roleName="Patient" />;
  }
  if (isAdmin && verifiedRole && verifiedRole !== 'admin' && verifiedRole !== 'hospital-admin') {
    const redirectTarget = `/dashboard/${verifiedRole}`;
    return <AccessDenied redirectTo={redirectTarget} roleName="Hospital Administrator" />;
  }

  const roleConfigs: Record<string, {
    title: string; subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
    metrics: { label: string; value: string; change: string }[];
    actions: string[];
  }> = {
    doctor: {
      title:    'Doctor Clinical Workstation',
      subtitle: `Attending Physician: Dr. ${displayName}`,
      icon:     Stethoscope,
      badge:    'Physician Workstation',
      metrics: [
        { label: 'Assigned Patients',       value: '6',  change: '1 critical'             },
        { label: 'AI Summaries Generated',  value: '14', change: 'Today'                   },
        { label: 'Clinical Guidelines',     value: '9',  change: 'Hospital-approved'       },
        { label: 'Pending Lab Reports',     value: '3',  change: 'Awaiting review'         },
      ],
      actions: [
        'Review Patient Records',
        'Generate AI Summary',
        'Browse Clinical Guidelines',
        'View Appointments',
      ],
    },
    nurse: {
      title:    'Nurse Ward Care Portal',
      subtitle: `Head Nurse: ${displayName}`,
      icon:     HeartPulse,
      badge:    'Nursing Workstation',
      metrics: [
        { label: 'Assigned Ward Beds',   value: '12',        change: 'All vitals normal' },
        { label: 'Medication Doses Due', value: '8',         change: 'Next in 15 mins'   },
        { label: 'Shift Handover Notes', value: 'Completed', change: '100% verified'      },
        { label: 'Telemetry Alerts',     value: '0 Active',  change: 'All clear'          },
      ],
      actions: [
        'Record Patient Vitals',
        'Log Medication Administered',
        'Update Shift Handover',
        'Request Physician Triage',
      ],
    },
    patient: {
      title:    'Patient Health Companion',
      subtitle: `Patient: ${displayName}`,
      icon:     User,
      badge:    'Personal Health Portal',
      metrics: [
        { label: 'Active Prescriptions', value: '4 Medicines', change: 'Current Regimen' },
        { label: 'Medicine Reminders',   value: '1 Due Now',   change: 'Next in 30 mins' },
        { label: 'Uploaded Documents',   value: '5 Files',     change: 'Verified EHR' },
        { label: 'Blood Pressure',       value: '134/86',      change: 'Optimal Range' },
      ],
      actions: [
        'Upload Medical Document',
        'View My Prescriptions',
        'Check Medicine Reminders',
        'View Medical History',
      ],
    },
    admin: {
      title:    'Hospital Executive Analytics',
      subtitle: `Administrator: ${displayName}`,
      icon:     Building,
      badge:    'Executive Dashboard',
      metrics: [
        { label: 'Bed Occupancy Rate',     value: '88.5%',        change: 'Optimal allocation' },
        { label: 'Registered Patients',    value: '1,420',        change: 'Active in system'   },
        { label: 'Active Medical Staff',   value: '180 Staff',    change: '48 MDs, 132 RNs'    },
        { label: 'Completed Consultations',value: '2,740',        change: '83.5% completion'   },
      ],
      actions: [
        'Hospital Notifications',
        'Hospital Reports & Stats',
        'Hospital Activity Monitor',
        'Department Analytics',
      ],
    },
    'hospital-admin': {
      title:    'Hospital Executive Analytics',
      subtitle: `Administrator: ${displayName}`,
      icon:     Building,
      badge:    'Executive Dashboard',
      metrics: [
        { label: 'Bed Occupancy Rate',     value: '88.5%',        change: 'Optimal allocation' },
        { label: 'Registered Patients',    value: '1,420',        change: 'Active in system'   },
        { label: 'Active Medical Staff',   value: '180 Staff',    change: '48 MDs, 132 RNs'    },
        { label: 'Completed Consultations',value: '2,740',        change: '83.5% completion'   },
      ],
      actions: [
        'Hospital Notifications',
        'Hospital Reports & Stats',
        'Hospital Activity Monitor',
        'Department Analytics',
      ],
    },
    'system-admin': {
      title:    'System Security Operations',
      subtitle: `System Administrator: ${displayName}`,
      icon:     ShieldCheck,
      badge:    'Security Control Panel',
      metrics: [
        { label: 'Server Availability',   value: '99.99%',             change: 'Zero downtime'  },
        { label: 'Microservice Latency',  value: '38 ms',              change: 'Sub-50ms SLA'   },
        { label: 'HIPAA Audit Logs',      value: 'Immutable',          change: '1.2M events'    },
        { label: 'Security Threat Score', value: 'A+ (0 Vulns)',       change: 'Shield Active'  },
      ],
      actions: [
        'Inspect Live Audit Logs',
        'Manage User Roles & MFA',
        'Monitor Microservice Health',
        'Run Automated Vulnerability Scan',
      ],
    },
  };

  const config   = roleConfigs[activeRole] || roleConfigs.doctor;
  const RoleIcon = config.icon;

  // Quick actions navigation
  const handleQuickAction = (action: string) => {
    if (isNurse && action === 'Record Patient Vitals') {
      setActiveView('observations');
    } else if (isDoctor && action === 'Review Patient Records') {
      setActiveView('patient-records');
    } else if (isDoctor && action === 'Generate AI Summary') {
      setActiveView('ai-summaries');
    } else if (isDoctor && action === 'Browse Clinical Guidelines') {
      setActiveView('guidelines');
    } else if (isPatient) {
      if (action === 'Upload Medical Document' || action === 'View Lab Results') {
        setActiveView('documents');
      } else if (action === 'View My Prescriptions' || action === 'Request Prescription Refill') {
        setActiveView('prescriptions');
      } else if (action === 'Check Medicine Reminders') {
        setActiveView('reminders');
      } else if (action === 'View Medical History') {
        setActiveView('medical-history');
      } else if (action === 'View Health Profile') {
        setActiveView('profile');
      } else if (action === 'Book Doctor Appointment') {
        setActiveView('appointments');
      } else if (action === 'Ask AI Health Assistant') {
        setActiveView('ai-health-summary');
      } else {
        setActiveView('documents');
      }
    } else if (isAdmin) {
      if (action === 'Hospital Notifications') {
        setActiveView('notifications');
      } else if (action === 'Hospital Reports & Stats') {
        setActiveView('reports');
      } else if (action === 'Hospital Activity Monitor') {
        setActiveView('activities');
      } else if (action === 'Department Analytics') {
        setActiveView('departments');
      } else {
        setActiveView('notifications');
      }
    } else {
      alert(`Launching action: "${action}"`);
    }
  };

  // ── Sidebar nav for Admin ──────────────────────────────────────
  const renderAdminSidebar = (mobile = false) => (
    <nav className="space-y-1">
      {HOSPITAL_ADMIN_NAV.map(({ id, label, icon: Icon, comingSoon }) => (
        <button
          key={id}
          onClick={() => { setActiveView(id); if (mobile) setMobileNavOpen(false); }}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all w-full group ${
            activeView === id
              ? 'bg-primary text-white shadow-glow-primary border border-primary-light/30'
              : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <Icon className={`w-4 h-4 flex-shrink-0 ${activeView === id ? 'text-white' : 'text-gray-500 group-hover:text-accent'}`} />
          <span className="flex-1">{label}</span>
          {comingSoon && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">SOON</span>
          )}
          {activeView === id && !comingSoon && <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>
      ))}
    </nav>
  );

  // ── Sidebar nav for patients ───────────────────────────────────
  const renderPatientSidebar = (mobile = false) => (
    <nav className="space-y-1">
      {PATIENT_NAV.map(({ id, label, icon: Icon, comingSoon }) => (
        <button
          key={id}
          onClick={() => { setActiveView(id); if (mobile) setMobileNavOpen(false); }}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all w-full group ${
            activeView === id
              ? 'bg-primary text-white shadow-glow-primary border border-primary-light/30'
              : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <Icon className={`w-4 h-4 flex-shrink-0 ${activeView === id ? 'text-white' : 'text-gray-500 group-hover:text-accent'}`} />
          <span className="flex-1">{label}</span>
          {id === 'notifications' && unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-navy-950 font-bold text-[10px]">
              {unreadCount}
            </span>
          )}
          {comingSoon && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">SOON</span>
          )}
          {activeView === id && !comingSoon && <ChevronRight className="w-3 h-3 ml-auto" />}
        </button>
      ))}
    </nav>
  );

  // ── Sidebar nav for doctors ────────────────────────────────────
  const renderDoctorSidebar = (mobile = false) => (
    <nav className="space-y-1">
      {DOCTOR_NAV.map(({ id, label, icon: Icon, comingSoon, hasSubmenu }) => {
        const isSelectedPRSection =
          (id === 'appointments' && activeView === 'patient-records' && doctorRecordTab === 'appointments') ||
          (id === 'prescriptions' && activeView === 'patient-records' && doctorRecordTab === 'prescriptions');

        const isPRGroupActive =
          id === 'patient-records' &&
          activeView === 'patient-records' &&
          ['overview', 'labs', 'notes', 'documents'].includes(doctorRecordTab);

        const isActive = (activeView === id && !isSelectedPRSection) || isSelectedPRSection || isPRGroupActive;

        return (
          <div key={id} className="space-y-1">
            <button
              onClick={() => {
                if (hasSubmenu) {
                  setActiveView('patient-records');
                  setDoctorRecordTab('overview');
                  setPatientRecordsExpanded((prev) => (activeView === 'patient-records' ? !prev : true));
                } else if (id === 'medical-history') {
                  setActiveView('medical-history');
                  if (mobile) setMobileNavOpen(false);
                } else if (id === 'appointments') {
                  setActiveView('patient-records');
                  setDoctorRecordTab('appointments');
                  if (mobile) setMobileNavOpen(false);
                } else if (id === 'prescriptions') {
                  setActiveView('patient-records');
                  setDoctorRecordTab('prescriptions');
                  if (mobile) setMobileNavOpen(false);
                } else {
                  setActiveView(id);
                  if (mobile) setMobileNavOpen(false);
                }
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all w-full group ${
                isActive
                  ? 'bg-primary text-white shadow-glow-primary border border-primary-light/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-accent'}`} />
              <span className="flex-1">{label}</span>
              {comingSoon && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">SOON</span>
              )}
              {hasSubmenu && (
                <ChevronDown
                  className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${
                    patientRecordsExpanded ? 'transform rotate-180 text-white' : 'text-gray-400'
                  }`}
                />
              )}
              {!hasSubmenu && isActive && !comingSoon && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>

            {/* Patient Records Dropdown Submenu */}
            {hasSubmenu && (
              <AnimatePresence>
                {patientRecordsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="pl-3.5 pr-1 py-1 space-y-1 border-l-2 border-primary/30 ml-3.5 my-1"
                  >
                    {PATIENT_RECORD_SUBITEMS.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeView === 'patient-records' && doctorRecordTab === sub.id;

                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setActiveView('patient-records');
                            setDoctorRecordTab(sub.id);
                            if (mobile) setMobileNavOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all w-full group ${
                            isSubActive
                              ? 'bg-accent/20 text-accent font-bold border border-accent/40 shadow-sm'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <SubIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSubActive ? 'text-accent' : 'text-gray-500 group-hover:text-gray-300'}`} />
                          <span className="flex-1 truncate">{sub.label}</span>
                          {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </nav>
  );

  // ── Main content renderer for Admin ────────────────────────────
  const renderAdminContent = () => {
    switch (activeView) {
      case 'notifications': return <HospitalNotificationsPage />;
      case 'reports':       return <HospitalReportsPage />;
      case 'activities':    return <HospitalActivityPage />;
      case 'departments':   return <ComingSoonView label="Department Analytics" />;
      case 'staff-rosters': return <ComingSoonView label="Staff Rosters" />;
      case 'profile':       return <ComingSoonView label="Administrator Profile" />;
      default:              return renderDefaultDashboard();
    }
  };

  // ── Main content renderer for Patient ──────────────────────────
  const renderPatientContent = () => {
    switch (activeView) {
      case 'profile':           return <HealthProfilePage />;
      case 'medical-history':   return <MedicalHistoryPage />;
      case 'prescriptions':     return <PrescriptionsPage />;
      case 'documents':         return <MedicalDocumentsPage />;
      case 'reminders':         return <MedicineRemindersPage />;
      case 'notifications':     return <NotificationsPage onNavigateTab={(tab) => setActiveView(tab)} />;
      case 'appointments':      return <ComingSoonView label="Appointments" />;
      case 'ai-health-summary': return <ComingSoonView label="AI Health Summary" />;
      default:                  return renderDefaultDashboard();
    }
  };

  // ── Main content renderer for Doctor ───────────────────────────
  const renderDoctorContent = () => {
    switch (activeView) {
      case 'patient-records':
        return <PatientRecordsPage initialTab={doctorRecordTab} />;
      case 'ai-summaries':
        return <AIPatientSummaryPage />;
      case 'medical-history':
        return <PatientMedicalHistoryPage />;
      case 'guidelines':
        return <ClinicalGuidelinesPage />;
      case 'appointments':
        return <PatientRecordsPage initialTab="appointments" />;
      case 'prescriptions':
        return <PatientRecordsPage initialTab="prescriptions" />;
      case 'profile':
        return <ComingSoonView label="Profile" />;
      default:
        return renderDefaultDashboard();
    }
  };

  const renderDefaultDashboard = () => (
    <>
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 border border-accent/40 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-glow-primary flex-shrink-0">
              <RoleIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold border border-accent/40">{config.badge}</span>
                <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> HIPAA Authorized</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{config.title}</h1>
              <p className="text-xs sm:text-sm text-gray-300">{config.subtitle}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {config.metrics.map((m, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
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

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white text-left flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" /> Workstation Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {config.actions.map((act, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction(act)}
              className="glass-card-interactive p-4 border border-white/10 text-left flex items-center justify-between text-xs font-bold text-white hover:text-accent cursor-pointer group"
            >
              <span>{act}</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-accent transition-colors" />
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col font-sans">

      {/* Top Header */}
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
            {/* Mobile nav toggle */}
            {(isNurse || isDoctor || isPatient || isAdmin) && (
              <button
                onClick={() => setMobileNavOpen((o) => !o)}
                className="sm:hidden p-2 rounded-xl bg-white/10 border border-white/15 text-gray-300 hover:text-white transition-colors"
                aria-label="Toggle navigation"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            )}

            {/* Notification Bell for Patient */}
            {isPatient && (
              <button
                onClick={() => setActiveView('notifications')}
                className="relative p-2 rounded-xl bg-white/10 border border-white/15 text-gray-300 hover:text-white hover:bg-white/15 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-navy-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-gray-300">
              <RoleIcon className="w-4 h-4 text-accent" />
              <span className="font-semibold text-white uppercase">{activeRole.replace('-', ' ')}</span>
            </div>

            <Link to="/login" onClick={() => {
              localStorage.removeItem('meditwin_user');
              localStorage.removeItem('meditwin_token');
              sessionStorage.removeItem('meditwin_user');
              sessionStorage.removeItem('meditwin_token');
            }}>
              <Button variant="outline" size="sm" icon={<LogOut className="w-4 h-4" />}>Sign Out</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full">

        {/* ── Admin Sidebar ── */}
        {isAdmin && (
          <>
            <aside className="hidden sm:flex flex-col w-56 flex-shrink-0 py-6 pl-4 pr-2 space-y-1 sticky top-[73px] self-start max-h-[calc(100vh-73px)] overflow-y-auto">
              {renderAdminSidebar(false)}
            </aside>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="sm:hidden fixed top-[73px] left-0 right-0 z-30 bg-navy-900/98 backdrop-blur-xl border-b border-white/10 px-4 py-3"
              >
                {renderAdminSidebar(true)}
              </motion.div>
            )}
          </>
        )}

        {/* ── Patient Sidebar ── */}
        {isPatient && (
          <>
            <aside className="hidden sm:flex flex-col w-56 flex-shrink-0 py-6 pl-4 pr-2 space-y-1 sticky top-[73px] self-start max-h-[calc(100vh-73px)] overflow-y-auto">
              {renderPatientSidebar(false)}
            </aside>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="sm:hidden fixed top-[73px] left-0 right-0 z-30 bg-navy-900/98 backdrop-blur-xl border-b border-white/10 px-4 py-3"
              >
                {renderPatientSidebar(true)}
              </motion.div>
            )}
          </>
        )}

        {/* ── Nurse Sidebar ── */}
        {isNurse && (
          <>
            <aside className="hidden sm:flex flex-col w-56 flex-shrink-0 py-6 pl-4 pr-2 space-y-1 sticky top-[73px] self-start max-h-[calc(100vh-73px)] overflow-y-auto">
              {NURSE_NAV.map(({ id, label, icon: Icon, comingSoon }) => (
                <button
                  key={id}
                  onClick={() => setActiveView(id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all w-full group ${
                    activeView === id
                      ? 'bg-primary text-white shadow-glow-primary border border-primary-light/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${activeView === id ? 'text-white' : 'text-gray-500 group-hover:text-accent'}`} />
                  <span className="flex-1">{label}</span>
                  {comingSoon && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">SOON</span>
                  )}
                  {activeView === id && !comingSoon && <ChevronRight className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </aside>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="sm:hidden fixed top-[73px] left-0 right-0 z-30 bg-navy-900/98 backdrop-blur-xl border-b border-white/10 px-4 py-3 space-y-1"
              >
                {NURSE_NAV.map(({ id, label, icon: Icon, comingSoon }) => (
                  <button
                    key={id}
                    onClick={() => { setActiveView(id); setMobileNavOpen(false); }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-all w-full ${
                      activeView === id ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />{label}
                    {comingSoon && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400">SOON</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </>
        )}

        {/* ── Doctor Sidebar ── */}
        {isDoctor && (
          <>
            <aside className="hidden sm:flex flex-col w-56 flex-shrink-0 py-6 pl-4 pr-2 sticky top-[73px] self-start max-h-[calc(100vh-73px)] overflow-y-auto">
              {renderDoctorSidebar(false)}
            </aside>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="sm:hidden fixed top-[73px] left-0 right-0 z-30 bg-navy-900/98 backdrop-blur-xl border-b border-white/10 px-4 py-3"
              >
                {renderDoctorSidebar(true)}
              </motion.div>
            )}
          </>
        )}

        {/* ── Main content ── */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 space-y-8 min-w-0">
          {isAdmin ? (
            renderAdminContent()
          ) : isPatient ? (
            renderPatientContent()
          ) : isNurse && activeView === 'observations' ? (
            <NurseObservationsPage />
          ) : isNurse && activeView === 'nursing-notes' ? (
            <NursingNotesPage />
          ) : isNurse && activeView === 'medical-history' ? (
            <PatientMedicalHistoryPage />
          ) : isNurse && activeView === 'treatment-plans' ? (
            <PatientMedicalHistoryPage initialTab="treatment-plan" />
          ) : isNurse && activeView === 'medicine-reminders' ? (
            <ComingSoonView label="Medicine Reminders" />
          ) : isNurse && activeView === 'hospital-procedures' ? (
            <ComingSoonView label="Hospital Procedures" />
          ) : isNurse && activeView === 'profile' ? (
            <ComingSoonView label="Profile" />
          ) : isDoctor ? (
            renderDoctorContent()
          ) : (
            renderDefaultDashboard()
          )}
        </main>
      </div>
    </div>
  );
};
