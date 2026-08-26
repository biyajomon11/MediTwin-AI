import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Search,
  Clock,
  UserCheck,
  UserPlus,
  Calendar,
  CheckCircle2,
  XCircle,
  Bell,
  FileCheck,
  UserX,
  RefreshCw,
  Eye,
  X,
  List,
  Loader2,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as hospitalAdminService from '../../services/hospitalAdminService';
import type {
  HospitalActivity,
  HospitalActivityType,
} from '../../types';

const ACTIVITY_TYPES: (HospitalActivityType | 'All')[] = [
  'All',
  'New patient registered',
  'Doctor account created',
  'Nurse account created',
  'Appointment scheduled',
  'Appointment completed',
  'Appointment cancelled',
  'Hospital notification published',
  'Clinical guideline updated',
  'Hospital document uploaded',
  'User account deactivated',
];

const DEPARTMENTS = [
  'All',
  'Administration',
  'Cardiology',
  'Emergency Care',
  'General Medicine',
  'Nursing Administration',
  'Quality Assurance',
  'Information Technology',
  'Admissions & Patient Registration',
];

const STATUSES = ['All', 'Completed', 'Pending', 'Flagged', 'System Automated'];

export const HospitalActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<HospitalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // View Mode: 'list' or 'timeline'
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');

  // Detail Modal
  const [selectedActivity, setSelectedActivity] = useState<HospitalActivity | null>(null);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await hospitalAdminService.getHospitalActivities({
        search: searchQuery,
        activityType: selectedType as any,
        department: selectedDepartment,
        status: selectedStatus,
      });
      setActivities(data);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [searchQuery, selectedType, selectedDepartment, selectedStatus]);

  const getActivityIcon = (type: HospitalActivityType) => {
    switch (type) {
      case 'New patient registered':
        return <UserPlus className="w-4 h-4 text-cyan-400" />;
      case 'Doctor account created':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'Nurse account created':
        return <UserCheck className="w-4 h-4 text-pink-400" />;
      case 'Appointment scheduled':
        return <Calendar className="w-4 h-4 text-indigo-400" />;
      case 'Appointment completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'Appointment cancelled':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'Hospital notification published':
        return <Bell className="w-4 h-4 text-amber-400" />;
      case 'Clinical guideline updated':
        return <FileCheck className="w-4 h-4 text-sky-400" />;
      case 'Hospital document uploaded':
        return <FileCheck className="w-4 h-4 text-teal-400" />;
      case 'User account deactivated':
        return <UserX className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-accent" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Flagged':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'System Automated':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-white/10 text-gray-300 border-white/15';
    }
  };

  // Group activities by date bucket for timeline view
  const groupTimeline = () => {
    const today: HospitalActivity[] = [];
    const yesterday: HospitalActivity[] = [];
    const earlier: HospitalActivity[] = [];

    activities.forEach((act) => {
      if (act.dateTime.toLowerCase().includes('today')) {
        today.push(act);
      } else if (act.dateTime.toLowerCase().includes('yesterday')) {
        yesterday.push(act);
      } else {
        earlier.push(act);
      }
    });

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Earlier This Week', items: earlier },
    ].filter((g) => g.items.length > 0);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-accent/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary flex-shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  Hospital Audit &amp; Event Stream
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live Activity Log Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Hospital Activity &amp; Operations Monitor
              </h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Track all registrations, clinical consultations, announcements, and administrative events in real time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'timeline'
                  ? 'bg-accent text-navy-950 shadow-md font-bold'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-accent text-navy-950 shadow-md font-bold'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Filters and Search Toolbar ── */}
      <div className="glass-card p-4 border border-white/10 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by description, actor, ID..."
              className="w-full py-2.5 pl-10 pr-4 text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            />
          </div>

          {/* Activity Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-2.5 px-3 text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Activity Types' : t}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full py-2.5 px-3 text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2.5 px-3 text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Statuses' : s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-gray-400">
          <span>
            Displaying <strong className="text-white">{activities.length}</strong> hospital events
          </span>
          <Button
            variant="glass"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadActivities}
          >
            Refresh Log
          </Button>
        </div>
      </div>

      {/* ── Content View: Timeline or Table ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading hospital activities stream...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="glass-card border border-white/10 p-12 text-center text-gray-400">
          <Activity className="w-8 h-8 mx-auto text-gray-500 mb-2" />
          <p className="text-white font-bold">No hospital events found matching criteria.</p>
          <p className="text-xs text-gray-400 mt-1">Try resetting search filters.</p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* TIMELINE VIEW */
        <div className="space-y-6">
          {groupTimeline().map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-accent px-3 py-1 rounded-lg bg-accent/10 border border-accent/20">
                  {group.label}
                </span>
                <div className="h-px bg-white/10 flex-grow" />
              </div>

              <div className="grid grid-cols-1 gap-3 relative pl-4 border-l-2 border-accent/30 space-y-2">
                {group.items.map((act) => (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelectedActivity(act)}
                    className="glass-card-interactive p-4 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getActivityIcon(act.activityType)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">{act.activityType}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${getStatusBadge(act.status)}`}>
                            {act.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{act.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 pt-0.5">
                          <span>By: <strong className="text-white">{act.actor}</strong> ({act.actorRole})</span>
                          <span>•</span>
                          <span>Dept: <strong className="text-gray-200">{act.department}</strong></span>
                          {act.metadata && (
                            <>
                              <span>•</span>
                              <span className="text-accent">{act.metadata}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-400 font-mono self-start sm:self-center flex-shrink-0">
                      <div className="text-gray-300 font-bold">{act.dateTime}</div>
                      <div className="text-[10px] text-gray-500">{act.id}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="glass-card border border-white/10 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-gray-300 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Activity Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Actor / Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-accent font-bold">
                      {act.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-medium text-white">
                        {getActivityIcon(act.activityType)}
                        <span>{act.activityType}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 max-w-xs truncate">
                      {act.description}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{act.actor}</div>
                      <div className="text-[10px] text-gray-400">{act.actorRole}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300">{act.department}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                      {act.dateTime}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(act.status)}`}>
                        {act.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedActivity(act)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                        title="View Event Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Activity Detail Modal ── */}
      <AnimatePresence>
        {selectedActivity && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md"
            onClick={() => setSelectedActivity(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-lg w-full p-6 sm:p-8 border border-white/20 bg-navy-900/98 rounded-2xl space-y-5"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                    {getActivityIcon(selectedActivity.activityType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{selectedActivity.id}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedActivity.status)}`}>
                        {selectedActivity.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {selectedActivity.activityType}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail fields */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Event Description
                  </span>
                  <p className="text-sm text-gray-200">{selectedActivity.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Actor
                    </span>
                    <span className="text-white font-medium">{selectedActivity.actor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Actor Role
                    </span>
                    <span className="text-white font-medium">{selectedActivity.actorRole}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Department
                    </span>
                    <span className="text-white font-medium">{selectedActivity.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                      Timestamp
                    </span>
                    <span className="text-white font-mono">{selectedActivity.dateTime}</span>
                  </div>
                </div>

                {selectedActivity.metadata && (
                  <div className="p-3.5 rounded-xl bg-accent/5 border border-accent/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent block mb-1">
                      Event Metadata
                    </span>
                    <span className="font-mono text-xs text-gray-200">{selectedActivity.metadata}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  variant="glass"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => setSelectedActivity(null)}
                >
                  Close Activity Log
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HospitalActivityPage;
