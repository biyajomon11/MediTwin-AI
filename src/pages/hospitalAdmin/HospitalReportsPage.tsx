import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Printer,
  Eye,
  Search,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  ShieldCheck,
  Building,
  Activity,
  HeartPulse,
} from 'lucide-react';
import { Button } from '../../components/Button';
import * as hospitalAdminService from '../../services/hospitalAdminService';
import type {
  HospitalStatistics,
  HospitalReport,
  HospitalReportType,
} from '../../types';

const REPORT_TYPES: (HospitalReportType | 'All')[] = [
  'All',
  'Appointment Report',
  'Patient Statistics',
  'Staff Statistics',
  'Department Statistics',
  'Hospital Activity Report',
];

const DEPARTMENTS = [
  'All',
  'Cardiology',
  'Emergency Care',
  'General Medicine',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
];

export const HospitalReportsPage: React.FC = () => {
  const [stats, setStats] = useState<HospitalStatistics | null>(null);
  const [reports, setReports] = useState<HospitalReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportType, setSelectedReportType] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');

  // Modal for viewing full report
  const [activeReport, setActiveReport] = useState<HospitalReport | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, reportsData] = await Promise.all([
        hospitalAdminService.getHospitalStatistics(),
        hospitalAdminService.getHospitalReports({
          search: searchQuery,
          reportType: selectedReportType,
          department: selectedDepartment,
        }),
      ]);
      setStats(statsData);
      setReports(reportsData);
    } catch (err) {
      console.error('Error loading hospital reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedReportType, selectedDepartment]);

  const handlePrint = () => {
    window.print();
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
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-bold border border-accent/40">
                  Hospital Executive Intelligence
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Administrative Telemetry Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                Hospital Reports & Analytics Dashboard
              </h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Hospital-wide capacity statistics, clinical workload metrics, and compliance audit reports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="md"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => handlePrint()}
            >
              Print Executive Summary
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Metric Statistic Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Total Patients */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Patients</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats.totalPatients.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">+8.4% this month</span>
          </div>

          {/* Total Doctors */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Doctors</span>
              <HeartPulse className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats.totalDoctors}
            </div>
            <span className="text-[10px] text-gray-400">44 On active shift</span>
          </div>

          {/* Total Nurses */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Nurses</span>
              <Activity className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats.totalNurses}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">100% Ward Cover</span>
          </div>

          {/* Departments */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Departments</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats.totalDepartments}
            </div>
            <span className="text-[10px] text-gray-400">All Accredited</span>
          </div>

          {/* Total Appointments */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Appointments</span>
              <Calendar className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats.totalAppointments.toLocaleString()}
            </div>
            <span className="text-[10px] text-accent font-medium">Annualized</span>
          </div>

          {/* Completed Appointments */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
              {stats.completedAppointments.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-400">83.5% Success</span>
          </div>

          {/* Cancelled Appointments */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Cancelled</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-400">
              {stats.cancelledAppointments}
            </div>
            <span className="text-[10px] text-rose-300 font-medium">5.4% Rate</span>
          </div>

          {/* Active Users */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Users</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats.activeUsers}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Live In-Session</span>
          </div>
        </div>
      )}

      {/* ── Visual Analytics & Chart Grids ── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Appointment Volume Trends */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Monthly Outpatient & Inpatient Consultations
                </h3>
                <p className="text-[11px] text-gray-400">Scheduled vs Completed Consultations</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                +12% Workload Growth
              </span>
            </div>

            {/* Custom Bar Trend Visual */}
            <div className="space-y-3 pt-2">
              {stats.appointmentTrends.map((trend) => {
                const maxVal = 750;
                const completedPct = (trend.completed / maxVal) * 100;
                const scheduledPct = (trend.scheduled / maxVal) * 100;

                return (
                  <div key={trend.month} className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-300">
                      <span className="font-semibold text-white">{trend.month}</span>
                      <span className="font-mono text-[11px] text-gray-400">
                        {trend.completed} completed / {trend.scheduled} scheduled ({trend.cancelled} cancelled)
                      </span>
                    </div>

                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        style={{ width: `${completedPct}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-700"
                        title={`Completed: ${trend.completed}`}
                      />
                      <div
                        style={{ width: `${scheduledPct - completedPct}%` }}
                        className="h-full bg-cyan-500/40"
                        title={`Scheduled: ${trend.scheduled}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/5 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span>Completed Appointments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-cyan-500/40" />
                <span>Scheduled / Pending</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Patient Demographics & Age Distribution */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  Patient Demographics & Age Distribution
                </h3>
                <p className="text-[11px] text-gray-400">Patient cohort breakdown by age group & gender</p>
              </div>
              <span className="text-xs text-gray-400 font-mono">Total: {stats.totalPatients} Patients</span>
            </div>

            <div className="space-y-3 pt-2">
              {stats.patientDemographics.map((demo) => {
                const pct = ((demo.total / stats.totalPatients) * 100).toFixed(1);
                return (
                  <div key={demo.ageGroup} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-200">{demo.ageGroup}</span>
                      <span className="text-gray-400 font-mono">
                        {demo.total} patients ({pct}%) • {demo.male}M / {demo.female}F
                      </span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(demo.male / stats.totalPatients) * 100}%` }}
                        className="h-full bg-cyan-500"
                        title={`Male: ${demo.male}`}
                      />
                      <div
                        style={{ width: `${(demo.female / stats.totalPatients) * 100}%` }}
                        className="h-full bg-pink-500"
                        title={`Female: ${demo.female}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-white/5 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                <span>Male Patients</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-pink-500" />
                <span>Female Patients</span>
              </div>
            </div>
          </div>

          {/* Chart 3: Department Capacity & Bed Occupancy */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  Department Workload & Bed Occupancy Rates
                </h3>
                <p className="text-[11px] text-gray-400">Clinical departments capacity and staffing distribution</p>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">Avg {stats.bedOccupancyRate}% Occupancy</span>
            </div>

            <div className="space-y-3 pt-2">
              {stats.departmentStats.map((dept) => (
                <div key={dept.name} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">{dept.name}</span>
                    <span className="text-gray-400 font-mono">
                      {dept.patients} patients • {dept.doctors} MDs, {dept.nurses} RNs • {dept.occupancyRate}% Beds
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${dept.occupancyRate}%` }}
                      className={`h-full rounded-full transition-all duration-700 ${
                        dept.occupancyRate >= 95
                          ? 'bg-rose-500'
                          : dept.occupancyRate >= 85
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 4: Healthcare User Ecosystem & Role Distribution */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Hospital User Ecosystem & Account Verification
                </h3>
                <p className="text-[11px] text-gray-400">Active vs registered accounts across hospital roles</p>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">1,650 Total Users</span>
            </div>

            <div className="space-y-3 pt-2">
              {stats.userDistribution.map((u) => {
                const activePct = Math.round((u.active / u.count) * 100);
                return (
                  <div key={u.role} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-white">{u.role}</span>
                      <span className="text-gray-400 font-mono">
                        {u.count} registered • {u.active} active ({activePct}%) • {u.verified} verified
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${activePct}%` }}
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Reports Filter & Search Bar ── */}
      <div className="glass-card p-4 border border-white/10 space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-white">Hospital Administrative Reports Library</h3>
          </div>
          <span className="text-gray-400">
            {reports.length} report records ready for audit review
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by title or ID..."
              className="w-full py-2.5 pl-10 pr-4 text-white bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            />
          </div>

          {/* Report Type */}
          <div>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="w-full py-2.5 px-3 text-white bg-navy-900 border border-white/15 rounded-xl focus:outline-none focus:border-accent/60"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Report Types' : t}
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
        </div>
      </div>

      {/* ── Reports Table ── */}
      {loading ? (
        <div className="glass-card border border-white/10 p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Generating administrative reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card border border-white/10 p-12 text-center text-gray-400">
          <FileText className="w-8 h-8 mx-auto text-gray-500 mb-2" />
          <p className="text-white font-bold">No reports matched your filters.</p>
        </div>
      ) : (
        <div className="glass-card border border-white/10 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-gray-300 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Report Name &amp; ID</th>
                  <th className="py-3 px-4">Report Type</th>
                  <th className="py-3 px-4">Date Range</th>
                  <th className="py-3 px-4">Generated Date</th>
                  <th className="py-3 px-4">Generated By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{rep.name}</div>
                      <div className="text-[10px] font-mono text-accent">{rep.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px]">
                        {rep.reportType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-300 font-mono text-[11px]">
                      {rep.dateRange}
                    </td>
                    <td className="py-3.5 px-4 text-gray-300">{rep.generatedDate}</td>
                    <td className="py-3.5 px-4 text-gray-300">{rep.generatedBy}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {rep.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        variant="accent"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setActiveReport(rep)}
                      >
                        View Report
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        icon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setActiveReport(rep);
                          setTimeout(() => window.print(), 300);
                        }}
                      >
                        Print
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View Full Report Modal ── */}
      <AnimatePresence>
        {activeReport && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setActiveReport(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-3xl w-full p-6 sm:p-8 border border-white/20 bg-navy-900/98 max-h-[90vh] overflow-y-auto rounded-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-accent">{activeReport.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {activeReport.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-gray-300">
                      {activeReport.reportType}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white">{activeReport.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Period: {activeReport.dateRange} • Department: {activeReport.department}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint()}
                    className="p-2 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent transition-colors flex items-center gap-1.5 text-xs font-bold"
                    title="Print Report"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => setActiveReport(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-200 leading-relaxed">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">
                  Executive Summary
                </span>
                <p>{activeReport.summary}</p>
              </div>

              {/* Key Metrics Grid */}
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Key Performance Indicators
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeReport.metrics.map((m) => (
                    <div key={m.label} className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <div className="text-gray-400 text-[10px] uppercase font-bold">{m.label}</div>
                      <div className="text-lg font-extrabold text-white mt-1">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Table (if available) */}
              {activeReport.detailsTable && activeReport.detailsTable.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Departmental Audit Breakdown
                  </span>
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-300 uppercase tracking-wider text-[10px]">
                        <tr>
                          {Object.keys(activeReport.detailsTable[0]).map((col) => (
                            <th key={col} className="py-2.5 px-3">
                              {col.replace(/([A-Z])/g, ' $1').trim()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-200">
                        {activeReport.detailsTable.map((row, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="py-2 px-3 font-mono text-[11px]">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-gray-400">
                <div>Generated by: <strong className="text-white">{activeReport.generatedBy}</strong> on {activeReport.generatedDate}</div>
                <Button variant="glass" size="sm" onClick={() => setActiveReport(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HospitalReportsPage;
